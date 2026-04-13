#!/usr/bin/env tsx
/**
 * Translate locale namespace files from English and upload to Azure Blob Storage.
 * Optionally reviews translations with an LLM to fix idiomatic/technical terms.
 *
 * Usage:
 *   npm run i18n:translate                               # all namespaces, priority locales
 *   npm run i18n:translate -- --langs de-DE,fr-FR       # specific BCP47 locales
 *   npm run i18n:translate -- --namespace common        # single namespace
 *   npm run i18n:translate -- --force                   # overwrite existing
 *   npm run i18n:translate -- --no-llm                  # machine translation only
 *   npm run i18n:translate -- --local                   # write locally instead of uploading
 *   npm run i18n:translate -- --upload-en               # upload en-US source files
 *   npm run i18n:translate -- --dry-run                 # preview without API calls
 *   npm run i18n:translate -- --provider oc-01-openai   # select LLM provider
 */

import { createHmac } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..')

// ── Azure Translator Configuration ──────────────────────────────────────────

const TRANSLATOR_KEY = process.env.AZURE_TRANSLATOR_KEY || ''
const TRANSLATOR_ENDPOINT = 'https://api.cognitive.microsofttranslator.com'
const TRANSLATOR_REGION = 'northeurope'
const TRANSLATOR_API_VERSION = '3.0'

// ── Azure Blob Storage Configuration ────────────────────────────────────────

const STORAGE_ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT || 'starthnstorage'
const STORAGE_KEY = process.env.AZURE_STORAGE_KEY || ''
const STORAGE_CONTAINER = 'locales'
const STORAGE_API_VERSION = '2020-10-02'
const STORAGE_BASE_URL = `https://${STORAGE_ACCOUNT}.blob.core.windows.net`

// ── Constants ────────────────────────────────────────────────────────────────

const NAMESPACES = ['common', 'landing', 'pages', 'services', 'innovation-lab', 'auth', 'seo', 'blog']

const PRIORITY_LOCALES = [
  'bs-BA', 'hr-HR', 'sr-Latn', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'tr-TR',
  'ar-SA', 'pt-BR', 'nl-NL', 'ru-RU', 'ja-JP', 'zh-Hans', 'ko-KR',
]

const SOURCE_LOCALE = 'en-US'
const SOURCE_LANG = 'en'
const LOCALES_DIR = join(PROJECT_ROOT, 'public', 'locales')

const MAX_ELEMENTS_PER_REQUEST = 100
const MAX_CHARS_PER_REQUEST = 45_000
const MAX_TARGET_LANGS_PER_REQUEST = 10
const REQUEST_DELAY_MS = 500
const LLM_CHUNK_SIZE = 40
const DEFAULT_CONCURRENCY = 3 // parallel locale groups

// ── Types ────────────────────────────────────────────────────────────────────

interface LlmProviderConfig {
  baseUrl: string
  apiKey: string
  api: 'anthropic-messages' | 'openai-completions'
  headers?: Record<string, string>
}

interface TranslateConfig {
  activeProvider: string
  activeModel: string
  concurrency?: number
  providers: Record<string, LlmProviderConfig>
}

type FlatItems = Array<[string, string]>

// ── Language Map (parsed from languages.ts) ──────────────────────────────────

function loadLanguageMap(): { localeToAzure: Map<string, string>; azureToLocale: Map<string, string> } {
  const localeToAzure = new Map<string, string>()
  const azureToLocale = new Map<string, string>()

  const langFile = join(PROJECT_ROOT, 'src', 'lib', 'languages.ts')
  if (!existsSync(langFile)) {
    console.warn(`WARNING: ${langFile} not found. Using locale codes as-is.`)
    return { localeToAzure, azureToLocale }
  }

  const text = readFileSync(langFile, 'utf-8')
  const codeMatches = [...text.matchAll(/code:\s*'([^']+)'/g)].map((m) => m[1])
  const transMatches = [...text.matchAll(/translatorCode:\s*'([^']+)'/g)].map((m) => m[1])

  for (let i = 0; i < Math.min(codeMatches.length, transMatches.length); i++) {
    localeToAzure.set(codeMatches[i], transMatches[i])
    azureToLocale.set(transMatches[i], codeMatches[i])
  }

  return { localeToAzure, azureToLocale }
}

// ── JSON Flatten / Unflatten ─────────────────────────────────────────────────

function flattenJson(obj: Record<string, unknown> | unknown[], prefix = ''): FlatItems {
  const items: FlatItems = []
  const entries: Array<[string, unknown]> = Array.isArray(obj)
    ? obj.map((v, i) => [String(i), v])
    : Object.entries(obj)

  for (const [key, value] of entries) {
    const path = prefix ? `${prefix}.${key}` : key
    if (Array.isArray(value)) {
      items.push(...flattenJson(value, path))
    } else if (typeof value === 'object' && value !== null) {
      items.push(...flattenJson(value as Record<string, unknown>, path))
    } else if (typeof value === 'string') {
      items.push([path, value])
    }
  }
  return items
}

function unflattenJson(items: FlatItems, template: Record<string, unknown>): Record<string, unknown> {
  const result = JSON.parse(JSON.stringify(template)) as Record<string, unknown>
  for (const [path, value] of items) {
    const keys = path.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = result
    for (const k of keys.slice(0, -1)) {
      node = node[k]
    }
    node[keys[keys.length - 1]] = value
  }
  return result
}

// ── Interpolation Protection ─────────────────────────────────────────────────

const INTERP_RE = /\{\{([^}]+)\}\}/g

function protectInterpolations(text: string): string {
  return text.replace(INTERP_RE, '<span class="notranslate">{{$1}}</span>')
}

function restoreInterpolations(text: string): string {
  let result = text.replace(/<span class="notranslate">\{\{([^}]+)\}\}<\/span>/g, '{{$1}}')
  result = result.replace(/<span class=['"]notranslate['"]>/g, '')
  result = result.replace(/<\/span>/g, '')
  return result
}

// ── Azure Translator ─────────────────────────────────────────────────────────

class AzureTranslator {
  async translateBatch(texts: string[], targetLang: string, maxRetries = 8): Promise<string[]> {
    const url = `${TRANSLATOR_ENDPOINT}/translate`
    const params = new URLSearchParams({
      'api-version': TRANSLATOR_API_VERSION,
      from: SOURCE_LANG,
      to: targetLang,
      textType: 'html',
    })
    const headers: Record<string, string> = {
      'Ocp-Apim-Subscription-Key': TRANSLATOR_KEY,
      'Ocp-Apim-Subscription-Region': TRANSLATOR_REGION,
      'Content-Type': 'application/json',
      'X-ClientTraceId': crypto.randomUUID(),
    }
    const body = texts.map((t) => ({ text: t }))

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const resp = await fetch(`${url}?${params}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (resp.status === 429) {
        const retryAfter = parseInt(resp.headers.get('Retry-After') ?? '0', 10)
        const wait = Math.max(retryAfter, Math.pow(2, attempt + 2)) * 1000
        console.log(`    Rate limited, waiting ${wait / 1000}s (attempt ${attempt + 1}/${maxRetries})...`)
        await sleep(wait)
        continue
      }

      if (!resp.ok) {
        throw new Error(`Translator API error ${resp.status}: ${await resp.text()}`)
      }

      const results = (await resp.json()) as Array<{ translations: Array<{ text: string }> }>
      return results.map((r) => r.translations[0].text)
    }

    throw new Error(`Translator failed after ${maxRetries} attempts`)
  }

  /**
   * Translate a batch of texts to multiple target languages in a single API call.
   * Azure Translator supports up to 10 target languages per request.
   * Returns a map of targetLang → translated texts (in same order as input).
   */
  async translateBatchMultiTarget(
    texts: string[],
    targetLangs: string[],
    maxRetries = 8,
  ): Promise<Map<string, string[]>> {
    const url = `${TRANSLATOR_ENDPOINT}/translate`
    const params = new URLSearchParams({
      'api-version': TRANSLATOR_API_VERSION,
      from: SOURCE_LANG,
      textType: 'html',
    })
    for (const lang of targetLangs) params.append('to', lang)

    const headers: Record<string, string> = {
      'Ocp-Apim-Subscription-Key': TRANSLATOR_KEY,
      'Ocp-Apim-Subscription-Region': TRANSLATOR_REGION,
      'Content-Type': 'application/json',
      'X-ClientTraceId': crypto.randomUUID(),
    }
    const body = texts.map((t) => ({ text: t }))

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const resp = await fetch(`${url}?${params}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (resp.status === 429) {
        const retryAfter = parseInt(resp.headers.get('Retry-After') ?? '0', 10)
        const wait = Math.max(retryAfter, Math.pow(2, attempt + 2)) * 1000
        console.log(`    Rate limited, waiting ${wait / 1000}s (attempt ${attempt + 1}/${maxRetries})...`)
        await sleep(wait)
        continue
      }

      if (!resp.ok) {
        throw new Error(`Translator API error ${resp.status}: ${await resp.text()}`)
      }

      const results = (await resp.json()) as Array<{ translations: Array<{ text: string; to: string }> }>

      // Build per-language result arrays
      const langResults = new Map<string, string[]>()
      for (const lang of targetLangs) langResults.set(lang, [])

      for (const item of results) {
        for (const tr of item.translations) {
          langResults.get(tr.to)?.push(tr.text)
        }
      }

      return langResults
    }

    throw new Error(`Translator failed after ${maxRetries} attempts`)
  }

  /**
   * Translate a namespace to multiple target languages at once using multi-target batching.
   * Returns a map of azureCode → translated nested JSON.
   */
  async translateNamespaceMultiTarget(
    flatItems: FlatItems,
    template: Record<string, unknown>,
    targetLangs: string[],
    namespace: string,
  ): Promise<Map<string, Record<string, unknown>>> {
    const protected_ = flatItems.map(([path, val]) => [path, protectInterpolations(val)] as [string, string])

    // Build text batches respecting size limits
    const batches: Array<Array<[number, string, string]>> = []
    let current: Array<[number, string, string]> = []
    let currentChars = 0

    for (let i = 0; i < protected_.length; i++) {
      const [path, text] = protected_[i]
      const len = text.length
      if (current.length >= MAX_ELEMENTS_PER_REQUEST || currentChars + len > MAX_CHARS_PER_REQUEST) {
        if (current.length > 0) batches.push(current)
        current = []
        currentChars = 0
      }
      current.push([i, path, text])
      currentChars += len
    }
    if (current.length > 0) batches.push(current)

    // Per-language translated values, indexed by original position
    const perLang = new Map<string, Map<number, string>>()
    for (const lang of targetLangs) perLang.set(lang, new Map())

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx]
      const texts = batch.map(([, , text]) => text)
      const indices = batch.map(([i]) => i)

      const langResults = await this.translateBatchMultiTarget(texts, targetLangs)

      for (const [lang, translatedTexts] of langResults) {
        const langMap = perLang.get(lang)!
        for (let j = 0; j < indices.length; j++) {
          const text = translatedTexts[j]
          langMap.set(indices[j], text != null ? restoreInterpolations(text) : '')
        }
      }

      if (batchIdx < batches.length - 1) await sleep(REQUEST_DELAY_MS)

      const done = Math.min((batchIdx + 1) * MAX_ELEMENTS_PER_REQUEST, flatItems.length)
      const pct = Math.round((done / flatItems.length) * 100)
      process.stdout.write(`    [${targetLangs.join(',')}/${namespace}] ${done}/${flatItems.length} strings (${pct}%)\r`)
    }
    process.stdout.write('\n')

    // Build final nested JSON for each language
    const result = new Map<string, Record<string, unknown>>()
    for (const lang of targetLangs) {
      const langMap = perLang.get(lang)!
      const translatedFlat: FlatItems = flatItems.map(([path], i) => [path, langMap.get(i) ?? ''])
      result.set(lang, unflattenJson(translatedFlat, template))
    }

    return result
  }

  async translateNamespace(
    flatItems: FlatItems,
    template: Record<string, unknown>,
    targetLang: string,
    namespace: string,
  ): Promise<Record<string, unknown>> {
    const protected_ = flatItems.map(([path, val]) => [path, protectInterpolations(val)] as [string, string])

    // Build batches
    const batches: Array<Array<[number, string, string]>> = []
    let current: Array<[number, string, string]> = []
    let currentChars = 0

    for (let i = 0; i < protected_.length; i++) {
      const [path, text] = protected_[i]
      const len = text.length
      if (current.length >= MAX_ELEMENTS_PER_REQUEST || currentChars + len > MAX_CHARS_PER_REQUEST) {
        if (current.length > 0) batches.push(current)
        current = []
        currentChars = 0
      }
      current.push([i, path, text])
      currentChars += len
    }
    if (current.length > 0) batches.push(current)

    const translated = new Map<number, string>()

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx]
      const texts = batch.map(([, , text]) => text)
      const indices = batch.map(([i]) => i)

      const results = await this.translateBatch(texts, targetLang)
      for (let j = 0; j < indices.length; j++) {
        translated.set(indices[j], restoreInterpolations(results[j]))
      }

      if (batchIdx < batches.length - 1) await sleep(REQUEST_DELAY_MS)

      const done = Math.min((batchIdx + 1) * MAX_ELEMENTS_PER_REQUEST, flatItems.length)
      const pct = Math.round((done / flatItems.length) * 100)
      process.stdout.write(`    [${targetLang}/${namespace}] ${done}/${flatItems.length} strings (${pct}%)\r`)
    }
    process.stdout.write('\n')

    const translatedFlat: FlatItems = flatItems.map(([path], i) => [path, translated.get(i) ?? ''])
    return unflattenJson(translatedFlat, template)
  }

  async fetchSupportedLanguages(): Promise<string[]> {
    const url = `${TRANSLATOR_ENDPOINT}/languages?api-version=${TRANSLATOR_API_VERSION}&scope=translation`
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`Failed to fetch languages: ${resp.status}`)
    const data = (await resp.json()) as { translation: Record<string, unknown> }
    return Object.keys(data.translation).sort()
  }
}

// ── Azure Blob Storage ───────────────────────────────────────────────────────

class BlobStorage {
  private blobNow(): string {
    return new Date().toUTCString()
  }

  private canonicalHeaders(headers: Record<string, string>): string {
    return Object.entries(headers)
      .filter(([k]) => k.startsWith('x-ms-'))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}\n`)
      .join('')
  }

  private sign(
    method: string,
    canonHeadersStr: string,
    canonResource: string,
    contentLength = 0,
    contentType = '',
  ): string {
    const contentLengthStr = contentLength > 0 ? String(contentLength) : ''
    const sts =
      `${method}\n\n\n` +
      `${contentLengthStr}\n` +
      `\n${contentType}\n` +
      `\n\n\n\n\n\n` +
      canonHeadersStr +
      canonResource

    const keyBuf = Buffer.from(STORAGE_KEY, 'base64')
    const sig = createHmac('sha256', keyBuf).update(sts, 'utf8').digest('base64')
    return `SharedKey ${STORAGE_ACCOUNT}:${sig}`
  }

  async upload(locale: string, namespace: string, content: Buffer): Promise<void> {
    const blobPath = `${locale}/${namespace}.json`
    const contentType = 'application/json'
    const msDate = this.blobNow()

    const msHeaders: Record<string, string> = {
      'x-ms-blob-cache-control': 'public, max-age=86400',
      'x-ms-blob-content-type': contentType,
      'x-ms-blob-type': 'BlockBlob',
      'x-ms-date': msDate,
      'x-ms-version': STORAGE_API_VERSION,
    }

    const ch = this.canonicalHeaders(msHeaders)
    const cr = `/${STORAGE_ACCOUNT}/${STORAGE_CONTAINER}/${blobPath}`
    const auth = this.sign('PUT', ch, cr, content.length, contentType)

    const resp = await fetch(`${STORAGE_BASE_URL}/${STORAGE_CONTAINER}/${blobPath}`, {
      method: 'PUT',
      headers: {
        ...msHeaders,
        Authorization: auth,
        'Content-Type': contentType,
        'Content-Length': String(content.length),
      },
      body: content,
    })

    if (resp.status !== 200 && resp.status !== 201) {
      const text = await resp.text()
      throw new Error(`Upload failed for ${blobPath} (${resp.status}): ${text.slice(0, 200)}`)
    }
  }
}

// ── LLM Reviewer ────────────────────────────────────────────────────────────

class LlmReviewer {
  constructor(
    private provider: LlmProviderConfig,
    private model: string,
    private localeName: string,
  ) {}

  private buildPrompt(
    englishChunk: Record<string, string>,
    translatedChunk: Record<string, string>,
    locale: string,
  ): string {
    return `You are a professional translator reviewing UI translations for a tech company website.
Review the following translations from English to ${this.localeName} (${locale}) and correct any issues.

Rules:
1. Preserve {{interpolations}} exactly as-is — do not translate or modify them
2. Fix idiomatic phrases (e.g. "battle-tested" → context-appropriate native equivalent)
3. Technical terms (API, SDK, SaaS, etc.) — keep in English or use the standard local equivalent
4. Maintain a professional, marketing-appropriate tone
5. Return ONLY valid JSON with exactly the same keys as the translation input — no extra text

English source:
${JSON.stringify(englishChunk, null, 2)}

${this.localeName} translation to review:
${JSON.stringify(translatedChunk, null, 2)}`
  }

  async reviewChunk(
    englishChunk: Record<string, string>,
    translatedChunk: Record<string, string>,
    locale: string,
  ): Promise<Record<string, string>> {
    const prompt = this.buildPrompt(englishChunk, translatedChunk, locale)

    try {
      let responseText: string

      if (this.provider.api === 'anthropic-messages') {
        const url = `${this.provider.baseUrl.replace(/\/$/, '')}/v1/messages`
        const extraHeaders = this.provider.headers ?? {}
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'x-api-key': this.provider.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
            ...extraHeaders,
          },
          body: JSON.stringify({
            model: this.model,
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }],
          }),
        })
        if (!resp.ok) {
          const err = await resp.text()
          throw new Error(`LLM API error ${resp.status}: ${err.slice(0, 200)}`)
        }
        const data = (await resp.json()) as {
          content: Array<{ type: string; text: string }>
        }
        responseText = data.content.find((c) => c.type === 'text')?.text ?? ''
      } else {
        // openai-completions
        const url = `${this.provider.baseUrl.replace(/\/$/, '')}/chat/completions`
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.provider.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            max_completion_tokens: 4096,
          }),
        })
        if (!resp.ok) {
          const err = await resp.text()
          throw new Error(`LLM API error ${resp.status}: ${err.slice(0, 200)}`)
        }
        const data = (await resp.json()) as {
          choices: Array<{ message: { content: string } }>
        }
        responseText = data.choices[0]?.message?.content ?? ''
      }

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, responseText]
      const jsonStr = (jsonMatch[1] ?? responseText).trim()
      const reviewed = JSON.parse(jsonStr) as Record<string, string>

      // Validate keys match
      const expectedKeys = new Set(Object.keys(translatedChunk))
      const returnedKeys = new Set(Object.keys(reviewed))
      for (const k of expectedKeys) {
        if (!returnedKeys.has(k)) {
          throw new Error(`LLM response missing key: ${k}`)
        }
      }

      return reviewed
    } catch (err) {
      console.warn(`    WARNING: LLM review failed (${err instanceof Error ? err.message : err}), using machine translation`)
      return translatedChunk
    }
  }

  async reviewTranslation(
    englishFlat: FlatItems,
    translatedFlat: FlatItems,
    locale: string,
  ): Promise<FlatItems> {
    const result: FlatItems = []

    for (let i = 0; i < englishFlat.length; i += LLM_CHUNK_SIZE) {
      const enChunk = Object.fromEntries(englishFlat.slice(i, i + LLM_CHUNK_SIZE))
      const trChunk = Object.fromEntries(translatedFlat.slice(i, i + LLM_CHUNK_SIZE))

      const chunkNum = Math.floor(i / LLM_CHUNK_SIZE) + 1
      const totalChunks = Math.ceil(englishFlat.length / LLM_CHUNK_SIZE)
      process.stdout.write(`    LLM review chunk ${chunkNum}/${totalChunks}...\r`)

      const reviewed = await this.reviewChunk(enChunk, trChunk, locale)

      for (const [key] of englishFlat.slice(i, i + LLM_CHUNK_SIZE)) {
        result.push([key, reviewed[key] ?? trChunk[key]])
      }
    }
    process.stdout.write('\n')

    return result
  }
}

// ── State Manager ────────────────────────────────────────────────────────────

interface StateEntry {
  at: string
  error?: string
}

interface TranslateState {
  startedAt: string
  lastUpdated: string
  completed: Record<string, StateEntry>
  failed: Record<string, StateEntry>
}

const STATE_PATH = join(__dirname, 'translate.state.json')

class StateManager {
  private state: TranslateState

  constructor() {
    this.state = this.load()
  }

  private load(): TranslateState {
    if (existsSync(STATE_PATH)) {
      try {
        return JSON.parse(readFileSync(STATE_PATH, 'utf-8')) as TranslateState
      } catch {
        // corrupted — start fresh
      }
    }
    return { startedAt: new Date().toISOString(), lastUpdated: new Date().toISOString(), completed: {}, failed: {} }
  }

  private save() {
    this.state.lastUpdated = new Date().toISOString()
    writeFileSync(STATE_PATH, JSON.stringify(this.state, null, 2) + '\n', 'utf-8')
  }

  key(locale: string, namespace: string) {
    return `${locale}/${namespace}`
  }

  isCompleted(locale: string, namespace: string): boolean {
    return !!this.state.completed[this.key(locale, namespace)]
  }

  isFailed(locale: string, namespace: string): boolean {
    return !!this.state.failed[this.key(locale, namespace)]
  }

  markCompleted(locale: string, namespace: string) {
    const k = this.key(locale, namespace)
    this.state.completed[k] = { at: new Date().toISOString() }
    delete this.state.failed[k]
    this.save()
  }

  markFailed(locale: string, namespace: string, error: string) {
    const k = this.key(locale, namespace)
    this.state.failed[k] = { at: new Date().toISOString(), error }
    this.save()
  }

  getFailedKeys(): string[] {
    return Object.keys(this.state.failed)
  }

  reset() {
    this.state = { startedAt: new Date().toISOString(), lastUpdated: new Date().toISOString(), completed: {}, failed: {} }
    this.save()
  }

  printSummary() {
    const completedCount = Object.keys(this.state.completed).length
    const failedEntries = Object.entries(this.state.failed)
    console.log(`  State: ${completedCount} completed, ${failedEntries.length} failed`)
    if (failedEntries.length) {
      console.log('  Failed entries (rerun with --retry-failed):')
      for (const [k, v] of failedEntries) {
        console.log(`    ${k}: ${v.error ?? 'unknown error'}`)
      }
    }
  }
}

// ── Config Loading ───────────────────────────────────────────────────────────

function loadConfig(
  providerOverride?: string,
  modelOverride?: string,
): { config: TranslateConfig; provider: LlmProviderConfig; model: string } | null {
  const configPath = join(__dirname, 'translate.config.json')
  if (!existsSync(configPath)) {
    return null
  }

  try {
    const raw = readFileSync(configPath, 'utf-8')
    const config = JSON.parse(raw) as TranslateConfig
    const providerKey = providerOverride ?? config.activeProvider
    const provider = config.providers[providerKey]
    if (!provider) {
      console.warn(`WARNING: Provider '${providerKey}' not found in config. Available: ${Object.keys(config.providers).join(', ')}`)
      return null
    }
    return { config, provider, model: modelOverride ?? config.activeModel }
  } catch (err) {
    console.warn(`WARNING: Failed to load translate.config.json: ${err instanceof Error ? err.message : err}`)
    return null
  }
}

// ── Locale name lookup ───────────────────────────────────────────────────────

function getLocaleName(locale: string): string {
  const names: Record<string, string> = {
    'bs-BA': 'Bosnian', 'hr-HR': 'Croatian', 'sr-Latn': 'Serbian (Latin)',
    'de-DE': 'German', 'fr-FR': 'French', 'es-ES': 'Spanish', 'it-IT': 'Italian',
    'tr-TR': 'Turkish', 'ar-SA': 'Arabic', 'pt-BR': 'Brazilian Portuguese',
    'nl-NL': 'Dutch', 'ru-RU': 'Russian', 'ja-JP': 'Japanese',
    'zh-Hans': 'Simplified Chinese', 'ko-KR': 'Korean',
  }
  return names[locale] ?? locale
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseArgs(): {
  langs: string[]
  namespace: string | null
  force: boolean
  noLlm: boolean
  local: boolean
  uploadEn: boolean
  dryRun: boolean
  provider: string | null
  model: string | null
  all: boolean
  retryFailed: boolean
  reset: boolean
} {
  const argv = process.argv.slice(2)
  const get = (flag: string) => {
    const i = argv.indexOf(flag)
    return i !== -1 ? argv[i + 1] : null
  }
  const has = (flag: string) => argv.includes(flag)

  const langsRaw = get('--langs')
  const all = langsRaw === 'all'
  const langs = langsRaw && !all ? langsRaw.split(',').map((l) => l.trim()).filter(Boolean) : []

  return {
    langs,
    namespace: get('--namespace'),
    force: has('--force'),
    noLlm: has('--no-llm'),
    local: has('--local'),
    uploadEn: has('--upload-en'),
    dryRun: has('--dry-run'),
    provider: get('--provider'),
    model: get('--model'),
    all,
    retryFailed: has('--retry-failed'),
    reset: has('--reset'),
  }
}

// ── Main Pipeline ────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs()
  const { localeToAzure, azureToLocale } = loadLanguageMap()

  const translator = new AzureTranslator()
  const storage = new BlobStorage()
  const state = new StateManager()

  // Handle --reset
  if (args.reset) {
    state.reset()
    console.log('State reset. Run without --reset to start fresh.')
    return
  }

  // Load LLM config
  const llmSetup = args.noLlm ? null : loadConfig(args.provider ?? undefined, args.model ?? undefined)
  if (!args.noLlm && !llmSetup) {
    console.warn('WARNING: No LLM config found (scripts/translate.config.json). Running without LLM review.')
    console.warn('         Copy scripts/translate.config.example.json and fill in your credentials.')
  }

  // Determine namespaces
  const namespaces = args.namespace
    ? args.namespace.split(',').map((n) => n.trim()).filter(Boolean)
    : NAMESPACES

  for (const ns of namespaces) {
    if (!NAMESPACES.includes(ns)) {
      console.error(`ERROR: Unknown namespace '${ns}'. Valid: ${NAMESPACES.join(', ')}`)
      process.exit(1)
    }
  }

  // Upload English source files if requested
  if (args.uploadEn) {
    console.log('\nUploading en-US source files...')
    for (const ns of namespaces) {
      const srcFile = join(LOCALES_DIR, SOURCE_LOCALE, `${ns}.json`)
      if (!existsSync(srcFile)) {
        console.warn(`  SKIP: ${srcFile} not found`)
        continue
      }
      const data = readFileSync(srcFile)
      if (!args.dryRun) {
        await storage.upload(SOURCE_LOCALE, ns, data)
        console.log(`  Uploaded: ${SOURCE_LOCALE}/${ns}.json`)
      } else {
        console.log(`  [dry-run] Would upload: ${SOURCE_LOCALE}/${ns}.json`)
      }
    }
    if (!args.langs.length && !args.all) return
  }

  // Load source files
  console.log('\nLoading source files...')
  const nsData = new Map<string, { template: Record<string, unknown>; flat: FlatItems }>()
  let totalStrings = 0

  for (const ns of namespaces) {
    const srcFile = join(LOCALES_DIR, SOURCE_LOCALE, `${ns}.json`)
    if (!existsSync(srcFile)) {
      console.error(`ERROR: Source file not found: ${srcFile}`)
      process.exit(1)
    }
    const template = JSON.parse(readFileSync(srcFile, 'utf-8')) as Record<string, unknown>
    const flat = flattenJson(template)
    nsData.set(ns, { template, flat })
    totalStrings += flat.length
    console.log(`  ${ns}.json: ${flat.length} strings`)
  }
  console.log(`\nTotal strings per language: ${totalStrings}`)

  // Determine target languages
  let targetPairs: Array<[string, string]> // [azureCode, bcp47Locale]

  if (args.retryFailed) {
    // Build target pairs from failed state entries
    const failedKeys = state.getFailedKeys()
    if (failedKeys.length === 0) {
      console.log('No failed entries in state. Nothing to retry.')
      return
    }
    const locales = [...new Set(failedKeys.map((k) => k.split('/')[0]))]
    targetPairs = locales.map((loc) => [localeToAzure.get(loc) ?? loc, loc])
    console.log(`Retrying ${failedKeys.length} failed entries across ${locales.length} locale(s)`)
  } else if (args.all) {
    console.log('Fetching supported languages from Azure...')
    const azureLangs = await translator.fetchSupportedLanguages()
    targetPairs = azureLangs
      .filter((az) => az !== SOURCE_LANG)
      .map((az) => [az, azureToLocale.get(az) ?? az])
  } else if (args.langs.length > 0) {
    targetPairs = args.langs.map((raw) => {
      if (localeToAzure.has(raw)) return [localeToAzure.get(raw)!, raw]
      if (azureToLocale.has(raw)) return [raw, azureToLocale.get(raw)!]
      return [raw, raw]
    })
  } else {
    targetPairs = PRIORITY_LOCALES.map((loc) => [localeToAzure.get(loc) ?? loc, loc])
  }

  // Remove source language
  targetPairs = targetPairs.filter(([az, loc]) => az !== SOURCE_LANG && loc !== SOURCE_LOCALE)

  console.log(`Target languages: ${targetPairs.length}`)
  console.log(`Namespaces: ${namespaces.join(', ')}`)
  console.log(`LLM review: ${llmSetup ? `enabled (${llmSetup.config.activeProvider} / ${llmSetup.model})` : 'disabled'}`)

  if (args.dryRun) {
    console.log('\n[DRY RUN] Would process:')
    for (const [azCode, locale] of targetPairs) {
      for (const ns of namespaces) {
        let action: string
        if (!args.force && state.isCompleted(locale, ns)) {
          action = 'SKIP (done in state)'
        } else if (state.isFailed(locale, ns)) {
          action = 'RETRY (previously failed)'
        } else {
          action = 'translate + upload'
        }
        console.log(`  ${locale} (${azCode}) / ${ns}.json — ${action}`)
      }
    }
    return
  }

  // ── Process locales in multi-target batches ──
  let sessionCompleted = 0
  let sessionSkipped = 0
  let sessionErrors = 0

  // Filter out already-completed locales
  const pendingPairs = args.force
    ? targetPairs
    : targetPairs.filter(([, locale]) => !namespaces.every((ns) => state.isCompleted(locale, ns)))

  const skippedCount = targetPairs.length - pendingPairs.length
  if (skippedCount > 0) {
    console.log(`\nSkipping ${skippedCount} fully-completed locale(s)`)
    sessionSkipped += skippedCount * namespaces.length
  }

  // Chunk pending locales into groups of MAX_TARGET_LANGS_PER_REQUEST for multi-target translation
  const localeChunks: Array<Array<[string, string]>> = []
  for (let i = 0; i < pendingPairs.length; i += MAX_TARGET_LANGS_PER_REQUEST) {
    localeChunks.push(pendingPairs.slice(i, i + MAX_TARGET_LANGS_PER_REQUEST))
  }

  console.log(`\nProcessing ${pendingPairs.length} locale(s) in ${localeChunks.length} batch(es) of up to ${MAX_TARGET_LANGS_PER_REQUEST}`)

  for (let chunkIdx = 0; chunkIdx < localeChunks.length; chunkIdx++) {
    const chunk = localeChunks[chunkIdx]
    const azureCodes = chunk.map(([az]) => az)
    const localeMap = new Map(chunk.map(([az, loc]) => [az, loc]))

    console.log(`\n── Batch ${chunkIdx + 1}/${localeChunks.length}: ${chunk.map(([, l]) => l).join(', ')} ──`)

    for (const ns of namespaces) {
      const { template, flat: englishFlat } = nsData.get(ns)!

      // Filter to only locales that need this namespace
      const needsTranslation = chunk.filter(([, locale]) => {
        if (args.retryFailed && !state.isFailed(locale, ns)) return false
        if (!args.force && state.isCompleted(locale, ns)) return false
        return true
      })

      if (needsTranslation.length === 0) {
        sessionSkipped += chunk.length
        continue
      }

      const azCodes = needsTranslation.map(([az]) => az)

      try {
        // Azure Translator limit: 50,000 characters total per request (source text × target languages).
        // With notranslate spans wrapping interpolations, effective chars ~2x source.
        const totalSourceChars = englishFlat.reduce((sum, [, val]) => sum + val.length, 0)
        const effectiveChars = totalSourceChars * 2 // account for notranslate span wrapping
        // Max langs = floor(50000 / effectiveChars), clamped to [2, MAX_TARGET_LANGS_PER_REQUEST]
        const maxLangsPerRequest = Math.max(2, Math.min(
          MAX_TARGET_LANGS_PER_REQUEST,
          Math.floor(45000 / effectiveChars), // 45K with safety margin
        ))

        // 1. Multi-target machine translate — sub-batch if namespace is large
        const multiResult = new Map<string, Record<string, unknown>>()

        const langSubBatches: string[][] = []
        for (let i = 0; i < azCodes.length; i += maxLangsPerRequest) {
          langSubBatches.push(azCodes.slice(i, i + maxLangsPerRequest))
        }

        console.log(`  Translating ${ns}.json (${englishFlat.length} strings × ${azCodes.length} langs, ${langSubBatches.length} sub-batch${langSubBatches.length > 1 ? 'es' : ''})...`)

        for (const subBatch of langSubBatches) {
          const subResult = await translator.translateNamespaceMultiTarget(
            englishFlat, template, subBatch, ns
          )
          for (const [lang, data] of subResult) {
            multiResult.set(lang, data)
          }
          if (langSubBatches.length > 1) await sleep(REQUEST_DELAY_MS)
        }

        // 2. LLM review + save per locale (concurrent within batch)
        const reviewTasks = needsTranslation.map(async ([azCode, locale]) => {
          const translatedNested = multiResult.get(azCode)
          if (!translatedNested) {
            state.markFailed(locale, ns, 'No translation result')
            sessionErrors++
            return
          }

          try {
            let translatedFlat = flattenJson(translatedNested)

            // LLM review
            if (llmSetup) {
              const localeName = getLocaleName(locale)
              const reviewer = new LlmReviewer(llmSetup.provider, llmSetup.model, localeName)
              translatedFlat = await reviewer.reviewTranslation(englishFlat, translatedFlat, locale)
            }

            // Rebuild and serialize
            const finalJson = unflattenJson(translatedFlat, template)
            const outputBytes = Buffer.from(JSON.stringify(finalJson, null, 2) + '\n', 'utf-8')

            // Write or upload
            if (args.local) {
              const dir = join(LOCALES_DIR, locale)
              mkdirSync(dir, { recursive: true })
              writeFileSync(join(dir, `${ns}.json`), outputBytes)
            } else {
              await storage.upload(locale, ns, outputBytes)
            }

            state.markCompleted(locale, ns)
            sessionCompleted++
            console.log(`    ✓ ${locale}/${ns}.json`)
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            state.markFailed(locale, ns, msg)
            sessionErrors++
            console.error(`    ✗ ${locale}/${ns}.json: ${msg.slice(0, 100)}`)
          }
        })

        await Promise.all(reviewTasks)

        // Count skipped locales in this chunk for this namespace
        sessionSkipped += chunk.length - needsTranslation.length
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        for (const [, locale] of needsTranslation) {
          state.markFailed(locale, ns, msg)
          sessionErrors++
        }
        console.error(`  ERROR [batch/${ns}]: ${msg}`)
      }
    }

    // Delay between locale batches to avoid rate limiting
    if (chunkIdx < localeChunks.length - 1) await sleep(2000)
  }

  // ── Summary ──
  console.log(`\n${'='.repeat(60)}`)
  console.log('SESSION DONE')
  console.log(`  Completed this run: ${sessionCompleted}`)
  if (sessionSkipped) console.log(`  Skipped: ${sessionSkipped}`)
  if (sessionErrors) console.log(`  Failed this run: ${sessionErrors}`)
  console.log('')
  state.printSummary()
  if (sessionErrors) {
    console.log('\n  To retry failed entries:')
    console.log('    npm run i18n:translate -- --retry-failed')
    console.log('  To start completely fresh:')
    console.log('    npm run i18n:translate -- --reset && npm run i18n:translate')
  }
  console.log('='.repeat(60))
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
