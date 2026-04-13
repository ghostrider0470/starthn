/**
 * Comprehensive language metadata for all Azure Translator supported languages.
 * Source of truth for i18n-utils.ts and LanguageSwitcher.tsx.
 *
 * Codes are BCP 47 locale codes with region suffixes where applicable.
 * The translatorCode field stores the Azure Translator API code.
 *
 * To regenerate after Azure adds new languages, run:
 *   python scripts/translate-locales.py --dry-run
 */

export interface LanguageMeta {
  /** BCP 47 locale code (e.g. "en-US", "zh-Hans", "sr-Latn") */
  code: string
  /** English name */
  name: string
  /** Name in the language itself */
  nativeName: string
  /** ISO 3166-1 alpha-2 country code for flag emoji (null = no flag) */
  countryCode: string | null
  /** Azure Translator API code (e.g. "en", "zh-Hans", "sr-Latn") */
  translatorCode: string
}

/**
 * Convert a 2-letter ISO 3166-1 country code to a flag emoji.
 * Works in all modern browsers/OS via regional indicator symbols.
 */
export function countryCodeToEmoji(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
}

export const LANGUAGES: LanguageMeta[] = [
  { code: 'bs-BA', name: 'Bosnian', nativeName: 'Bosanski', countryCode: 'BA', translatorCode: 'bs' },
  { code: 'en-US', name: 'English', nativeName: 'English', countryCode: 'US', translatorCode: 'en' },
]

/** Quick lookup map: code → LanguageMeta */
export const LANGUAGE_MAP = new Map(LANGUAGES.map((l) => [l.code, l]))

/** Quick lookup map: translatorCode → LanguageMeta */
export const TRANSLATOR_CODE_MAP = new Map(LANGUAGES.map((l) => [l.translatorCode, l]))

/** All language codes as a flat array */
export const ALL_LANGUAGE_CODES = LANGUAGES.map((l) => l.code)

/** All Azure Translator codes as a flat array */
export const ALL_TRANSLATOR_CODES = LANGUAGES.map((l) => l.translatorCode)

