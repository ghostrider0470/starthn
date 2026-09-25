import { ALL_LANGUAGE_CODES, LANGUAGE_MAP, TRANSLATOR_CODE_MAP } from '@/lib/languages'

export const SUPPORTED_LOCALES = ALL_LANGUAGE_CODES
export type SupportedLocale = string

// Bosnian is the site's home language: every URL without a locale prefix
// (e.g. "/", "/services") resolves to it. Other languages are only served
// when the URL names them explicitly (e.g. "/en-US/services").
export const DEFAULT_LOCALE: SupportedLocale = 'bs-BA'

/**
 * Get the display label for a locale code.
 * Falls back to the code itself if not found in the languages list.
 */
export function getLocaleLabel(locale: string): string {
  return LANGUAGE_MAP.get(locale)?.nativeName ?? locale
}

export function isValidLocale(
  locale: string | undefined,
): locale is SupportedLocale {
  return !!locale && LANGUAGE_MAP.has(locale)
}

export function getLocaleFromPath(pathname: string): SupportedLocale {
  // Check first segment — could be a simple code like "de" or compound like "zh-Hans"
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return DEFAULT_LOCALE

  // Try 2-segment compound codes first (e.g., "zh-Hans" from "/zh-Hans/blog")
  if (segments.length >= 2) {
    const compound = `${segments[0]}-${segments[1]}`
    if (isValidLocale(compound)) return compound
  }

  // Then try single segment
  return isValidLocale(segments[0]) ? segments[0] : DEFAULT_LOCALE
}

export function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)

  // Check for compound locale (e.g., "zh-Hans")
  if (segments.length >= 2) {
    const compound = `${segments[0]}-${segments[1]}`
    if (isValidLocale(compound)) {
      const rest = segments.slice(2)
      return `/${rest.join('/')}`.replace(/\/+$/, '') || '/'
    }
  }

  const hasLocalePrefix = isValidLocale(segments[0])
  const pathWithoutLocale = hasLocalePrefix ? segments.slice(1) : segments
  return `/${pathWithoutLocale.join('/')}`.replace(/\/+$/, '') || '/'
}

const LOCALE_BY_LOWERCASE_CODE = new Map(
  ALL_LANGUAGE_CODES.map((code) => [code.toLowerCase(), code]),
)

/**
 * Map a near-miss locale segment to the supported locale it clearly means:
 * wrong case ("en-us" → "en-US") or a bare language code ("en" → "en-US",
 * "bs" → "bs-BA"). Returns null when the segment isn't a locale at all.
 */
export function resolveLocaleAlias(
  segment: string | undefined,
): SupportedLocale | null {
  if (!segment) return null
  const lower = segment.toLowerCase()
  if (isValidLocale(segment)) return segment

  return (
    LOCALE_BY_LOWERCASE_CODE.get(lower) ??
    TRANSLATOR_CODE_MAP.get(lower)?.code ??
    null
  )
}

export function withLocalePath(
  path: string,
  locale: SupportedLocale,
): string {
  const normalizedPath = stripLocalePrefix(path)
  return normalizedPath === '/' ? `/${locale}` : `/${locale}${normalizedPath}`
}

/**
 * Convert a UI locale code (BCP 47) to the Azure Translator locale code used
 * for file storage paths in blob storage.
 * Examples: en-US -> en, bs-BA -> bs, zh-Hans -> zh-Hans
 */
export function toTranslatorLocaleCode(locale: string): string {
  return LANGUAGE_MAP.get(locale)?.translatorCode ?? locale
}

// Azure Translator codes that use RTL scripts
const RTL_TRANSLATOR_CODES = new Set([
  'ar',  // Arabic
  'fa',  // Persian/Farsi
  'he',  // Hebrew
  'ur',  // Urdu
  'ug',  // Uyghur
  'ku',  // Kurdish (Kurmanji)
  'ckb', // Central Kurdish (Sorani)
  'ps',  // Pashto
  'sd',  // Sindhi
  'yi',  // Yiddish
  'dv',  // Divehi/Dhivehi
  'ks',  // Kashmiri
])

/**
 * Returns true if the given BCP 47 locale code uses a right-to-left script.
 */
export function isRtlLocale(locale: string): boolean {
  const translatorCode = toTranslatorLocaleCode(locale)
  return RTL_TRANSLATOR_CODES.has(translatorCode)
}

/**
 * Returns 'rtl' or 'ltr' based on the locale.
 */
export function getLocaleDir(locale: string): 'rtl' | 'ltr' {
  return isRtlLocale(locale) ? 'rtl' : 'ltr'
}
