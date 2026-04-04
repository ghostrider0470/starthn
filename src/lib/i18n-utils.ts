import { ALL_LANGUAGE_CODES, LANGUAGE_MAP, TRANSLATOR_CODE_MAP } from '@/lib/languages'

export const SUPPORTED_LOCALES = ALL_LANGUAGE_CODES
export type SupportedLocale = string

export const DEFAULT_LOCALE: SupportedLocale = 'en-US'

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

export function detectPreferredLocale(): SupportedLocale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE
  }

  const languageCandidates =
    Array.isArray(window.navigator.languages) &&
    window.navigator.languages.length > 0
      ? window.navigator.languages
      : [window.navigator.language]

  for (const lang of languageCandidates) {
    // Try exact match first (e.g. "en-US", "zh-Hans", "pt-PT")
    if (isValidLocale(lang)) return lang

    // Try matching via translator code (e.g. browser sends "en-GB" → base "en" → finds "en-US")
    const base = lang.split('-')[0].toLowerCase()
    const fromTranslator = TRANSLATOR_CODE_MAP.get(base)
    if (fromTranslator) return fromTranslator.code
  }

  return DEFAULT_LOCALE
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
