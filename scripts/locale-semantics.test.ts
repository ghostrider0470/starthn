import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const LOCALES_DIR = join(process.cwd(), 'public', 'locales')
const SOURCE_LOCALE = 'en-US'
const BOSNIAN_LOCALE = 'bs-BA'
const BALKAN_LOCALES = new Set(['bs-BA', 'hr-HR', 'sr-Latn'])

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

function readNamespace(locale: string, namespace: string): JsonValue {
  return JSON.parse(
    readFileSync(join(LOCALES_DIR, locale, `${namespace}.json`), 'utf8'),
  ) as JsonValue
}

function flattenStrings(value: JsonValue, prefix = ''): Map<string, string> {
  const result = new Map<string, string>()

  if (typeof value === 'string') {
    result.set(prefix, value)
    return result
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      for (const [path, text] of flattenStrings(item, `${prefix}.${index}`)) {
        result.set(path, text)
      }
    })
    return result
  }

  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key
      for (const [nestedPath, text] of flattenStrings(nested, path)) {
        result.set(nestedPath, text)
      }
    }
  }

  return result
}

function localeCodes(): string[] {
  return readdirSync(LOCALES_DIR).filter((entry) =>
    existsSync(join(LOCALES_DIR, entry, 'common.json')),
  )
}

describe('locale semantics', () => {
  it('keeps page icon identifiers language-neutral', () => {
    const sourceIcons = [...flattenStrings(readNamespace(SOURCE_LOCALE, 'pages'))]
      .filter(([path]) => path.endsWith('.icon'))

    const mismatches: string[] = []

    for (const locale of localeCodes()) {
      const localePages = flattenStrings(readNamespace(locale, 'pages'))
      for (const [path, sourceValue] of sourceIcons) {
        const localeValue = localePages.get(path)
        if (localeValue !== sourceValue) {
          mismatches.push(`${locale}:${path}=${localeValue ?? '<missing>'}`)
        }
      }
    }

    expect(mismatches).toEqual([])
  })

  it('does not leave Bosnian email/profile/support UI labels in non-Balkan locales', () => {
    const bosnianPages = flattenStrings(readNamespace(BOSNIAN_LOCALE, 'pages'))
    const checkedPaths = [
      'contact.methods.email.title',
      'contact.methods.email.description',
      'contact.form.email',
      'contact.form.validation.required.email',
      'contact.form.validation.email',
      'team.aria.email',
      'blog.newsletter.placeholder',
      'profile.general.email',
      'profile.general.phone',
      'profile.preferences.email.title',
      'profile.preferences.email.description',
      'support.cards.email.title',
      'support.cards.email.description',
    ]

    const leftovers: string[] = []

    for (const locale of localeCodes().filter((code) => !BALKAN_LOCALES.has(code))) {
      const localePages = flattenStrings(readNamespace(locale, 'pages'))
      for (const path of checkedPaths) {
        if (localePages.get(path) === bosnianPages.get(path)) {
          leftovers.push(`${locale}:${path}`)
        }
      }
    }

    expect(leftovers).toEqual([])
  })

  it('does not keep known literal machine mistranslations in service navigation labels', () => {
    const knownBadValues = new Set([
      'Verbindungen starten HN',
      'Les services débutent HN',
      'Servicios Inician HN',
      'Hizmetler HN başlıyor',
      'الخدمات تبدأ HN',
      'サービス開始 HN',
      'Zurück zum Einsatz',
      'Retour en service',
      'Vuelta al servicio',
      'Hizmete dönüş',
      '復帰',
      'Bücher einrichten und herunterladen',
      'Configurez et téléchargez des livres',
      'Configurar y descargar libros',
      'Kitapları kur ve indir',
      'إعداد وتحميل الكتب',
      '本の設定とダウンロード',
    ])

    const hits: string[] = []

    for (const locale of localeCodes()) {
      const services = flattenStrings(readNamespace(locale, 'services'))
      for (const [path, value] of services) {
        if (knownBadValues.has(value)) hits.push(`${locale}:${path}=${value}`)
      }
    }

    expect(hits).toEqual([])
  })
})
