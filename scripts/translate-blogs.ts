#!/usr/bin/env tsx
/**
 * Translate all published blog posts to all supported languages via the backend API.
 * Uses Azure Translator + LLM review (configured in the backend).
 * Tracks progress in a state file so it can resume where it left off.
 *
 * Usage:
 *   npm run blog:translate                         # translate all missing
 *   npm run blog:translate -- --slug my-post       # single post only
 *   npm run blog:translate -- --force              # redo all, even completed
 *   npm run blog:translate -- --retry-failed       # retry only failed entries
 *   npm run blog:translate -- --reset              # clear state and start fresh
 *   npm run blog:translate -- --dry-run            # preview without API calls
 *   npm run blog:translate -- --batch 5            # languages per API call (default all)
 *   npm run blog:translate -- --delay 2000         # ms between calls (default 1000)
 *   npm run blog:translate -- --api-url http://... # override API URL
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ── Configuration ───────────────────────────────────────────────────────────

const DEFAULT_API_URL = 'http://localhost:8000/api'
const API_KEY = 'ht_qS_w7z9hNZCtoP-nPJo3Iz6KigIU-ZiF8gag19QhY1B3XY-8B8VbLlxV0vhjJfr7'
const STATE_PATH = join(__dirname, 'blog-translate.state.json')

const ALL_LANGUAGES = [
  'af','am','ar','as','az','ba','be','bg','bho','bn','bo','brx','bs','ca','cs','cy','da','de',
  'doi','dsb','dv','el','es','et','eu','fa','fi','fil','fj','fo','fr','fr-CA','ga','gl','gom',
  'gu','ha','he','hi','hne','hr','hsb','ht','hu','hy','id','ig','ikt','is','it','iu','iu-Latn',
  'ja','ka','kk','km','kmr','kn','ko','ks','ku','ky','lb','ln','lo','lt','lug','lv','lzh','mai',
  'mg','mi','mk','ml','mn-Cyrl','mn-Mong','mni','mr','ms','mt','mww','my','nb','ne','nl','nso',
  'nya','or','otq','pa','pl','prs','ps','pt','pt-PT','ro','ru','run','rw','sd','si','sk','sl',
  'sm','sn','so','sq','sr-Cyrl','sr-Latn','st','sv','sw','ta','te','th','ti','tk','tlh-Latn',
  'tlh-Piqd','tn','to','tr','tt','ty','ug','uk','ur','uz','vi','xh','yo','yua','yue','zh-Hans',
  'zh-Hant','zu',
]

// ── Types ───────────────────────────────────────────────────────────────────

interface BlogPost {
  slug: string
  isPublished: boolean
  translations: Record<string, unknown>
}

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

// ── State Manager ───────────────────────────────────────────────────────────

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

  key(slug: string, lang: string) { return `${slug}/${lang}` }

  isCompleted(slug: string, lang: string): boolean {
    return !!this.state.completed[this.key(slug, lang)]
  }

  isFailed(slug: string, lang: string): boolean {
    return !!this.state.failed[this.key(slug, lang)]
  }

  markCompleted(slug: string, lang: string) {
    const k = this.key(slug, lang)
    this.state.completed[k] = { at: new Date().toISOString() }
    delete this.state.failed[k]
    this.save()
  }

  markFailed(slug: string, lang: string, error: string) {
    const k = this.key(slug, lang)
    this.state.failed[k] = { at: new Date().toISOString(), error }
    this.save()
  }

  getFailedKeys(): string[] {
    return Object.keys(this.state.failed)
  }

  reset() {
    this.state = { startedAt: new Date().toISOString(), lastUpdated: new Date().toISOString(), completed: {}, failed: {} }
    this.save()
    console.log('State reset.')
  }

  printSummary() {
    const completedCount = Object.keys(this.state.completed).length
    const failedEntries = Object.entries(this.state.failed)
    console.log(`  State: ${completedCount} completed, ${failedEntries.length} failed`)
    if (failedEntries.length > 0 && failedEntries.length <= 20) {
      console.log('  Failed entries:')
      for (const [k, v] of failedEntries) {
        console.log(`    ${k}: ${v.error ?? 'unknown'}`)
      }
    } else if (failedEntries.length > 20) {
      console.log(`  (${failedEntries.length} failed — run with --retry-failed)`)
    }
  }
}

// ── API Client ──────────────────────────────────────────────────────────────

class BlogApiClient {
  constructor(private baseUrl: string) {}

  private get headers() {
    return {
      'X-Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    }
  }

  async getPublishedPosts(): Promise<BlogPost[]> {
    const res = await fetch(`${this.baseUrl}/manage/blog`, { headers: this.headers })
    if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`)
    return (await res.json()) as BlogPost[]
  }

  async translatePost(slug: string, languages: string[]): Promise<void> {
    const res = await fetch(`${this.baseUrl}/manage/blog/${slug}/translate`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ languages }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseArgs() {
  const argv = process.argv.slice(2)
  const get = (flag: string) => {
    const i = argv.indexOf(flag)
    return i !== -1 ? argv[i + 1] : null
  }
  const has = (flag: string) => argv.includes(flag)

  return {
    slug: get('--slug'),
    force: has('--force'),
    retryFailed: has('--retry-failed'),
    reset: has('--reset'),
    dryRun: has('--dry-run'),
    batch: parseInt(get('--batch') ?? '10', 10), // 10 langs per API call (avoids timeout)
    delay: parseInt(get('--delay') ?? '500', 10),
    apiUrl: get('--api-url') ?? DEFAULT_API_URL,
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs()
  const state = new StateManager()
  const api = new BlogApiClient(args.apiUrl)

  if (args.reset) {
    state.reset()
    return
  }

  const effectiveBatch = args.batch === 0 ? Infinity : args.batch
  console.log(`\nAPI: ${args.apiUrl}`)
  console.log(`Batch size: ${args.batch === 0 ? 'all (single call)' : `${args.batch} language(s) per call`}`)
  console.log(`Delay: ${args.delay}ms between calls`)

  // Fetch posts
  console.log('\nFetching published blog posts...')
  const allPosts = await api.getPublishedPosts()
  const posts = allPosts.filter((p) => p.isPublished)
    .filter((p) => !args.slug || p.slug === args.slug)

  if (posts.length === 0) {
    console.log(args.slug ? `Post '${args.slug}' not found or not published.` : 'No published posts found.')
    return
  }

  console.log(`Found ${posts.length} post(s)`)

  // Build work items
  type WorkItem = { slug: string; lang: string }
  const work: WorkItem[] = []

  for (const post of posts) {
    for (const lang of ALL_LANGUAGES) {
      if (args.retryFailed) {
        if (state.isFailed(post.slug, lang)) work.push({ slug: post.slug, lang })
      } else if (args.force) {
        work.push({ slug: post.slug, lang })
      } else if (!state.isCompleted(post.slug, lang)) {
        work.push({ slug: post.slug, lang })
      }
    }
  }

  if (work.length === 0) {
    console.log('\nNothing to do — all translations are complete.')
    state.printSummary()
    return
  }

  console.log(`\nWork items: ${work.length} (${posts.length} posts × languages)`)

  if (args.dryRun) {
    console.log('\n[DRY RUN] Would translate:')
    let current = ''
    for (const { slug, lang } of work) {
      if (slug !== current) {
        current = slug
        console.log(`\n  ${slug}:`)
      }
      process.stdout.write(`    ${lang} `)
    }
    console.log('\n')
    return
  }

  // Process
  let completed = 0
  let skipped = 0
  let failed = 0
  const startTime = Date.now()

  // Group work into batches per slug
  let i = 0
  while (i < work.length) {
    const item = work[i]
    const batch: string[] = []

    // Collect up to effectiveBatch languages for the same slug
    while (i < work.length && work[i].slug === item.slug && batch.length < effectiveBatch) {
      batch.push(work[i].lang)
      i++
    }

    const progress = `[${completed + failed + skipped + 1}/${work.length}]`
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    const eta = completed > 0
      ? Math.round(((Date.now() - startTime) / completed) * (work.length - completed - failed - skipped) / 1000)
      : '?'

    process.stdout.write(
      `${progress} ${item.slug} → ${batch.join(',')} (${elapsed}s elapsed, ~${eta}s remaining) ... `
    )

    try {
      await api.translatePost(item.slug, batch)
      for (const lang of batch) state.markCompleted(item.slug, lang)
      completed += batch.length
      console.log('OK')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      for (const lang of batch) state.markFailed(item.slug, lang, msg)
      failed += batch.length
      console.log(`FAIL: ${msg.slice(0, 100)}`)
    }

    if (i < work.length) await sleep(args.delay)
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('SESSION COMPLETE')
  console.log(`  Completed: ${completed}`)
  if (skipped) console.log(`  Skipped: ${skipped}`)
  if (failed) console.log(`  Failed: ${failed}`)
  console.log(`  Duration: ${((Date.now() - startTime) / 1000 / 60).toFixed(1)} minutes`)
  console.log('')
  state.printSummary()
  if (failed) {
    console.log('\n  To retry failed:')
    console.log('    npm run blog:translate -- --retry-failed')
    console.log('  To start fresh:')
    console.log('    npm run blog:translate -- --reset')
  }
  console.log('='.repeat(60))
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
