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
  { code: 'en-US',    name: 'English',                nativeName: 'English',        countryCode: 'US', translatorCode: 'en' },
  { code: 'bs-BA',    name: 'Bosnian',                nativeName: 'Bosanski',       countryCode: 'BA', translatorCode: 'bs' },
  { code: 'hr-HR',    name: 'Croatian',               nativeName: 'Hrvatski',       countryCode: 'HR', translatorCode: 'hr' },
  { code: 'sr-Latn',  name: 'Serbian (Latin)',        nativeName: 'Srpski',         countryCode: 'RS', translatorCode: 'sr-Latn' },
  { code: 'de-DE',    name: 'German',                 nativeName: 'Deutsch',        countryCode: 'DE', translatorCode: 'de' },
  { code: 'fr-FR',    name: 'French',                 nativeName: 'Français',       countryCode: 'FR', translatorCode: 'fr' },
  { code: 'es-ES',    name: 'Spanish',                nativeName: 'Español',        countryCode: 'ES', translatorCode: 'es' },
  { code: 'it-IT',    name: 'Italian',                nativeName: 'Italiano',       countryCode: 'IT', translatorCode: 'it' },
  { code: 'tr-TR',    name: 'Turkish',                nativeName: 'Türkçe',         countryCode: 'TR', translatorCode: 'tr' },
  { code: 'ar-SA',    name: 'Arabic',                 nativeName: 'العربية',        countryCode: 'SA', translatorCode: 'ar' },
  { code: 'pt-BR',    name: 'Portuguese (Brazil)',    nativeName: 'Português',      countryCode: 'BR', translatorCode: 'pt' },
  { code: 'nl-NL',    name: 'Dutch',                  nativeName: 'Nederlands',     countryCode: 'NL', translatorCode: 'nl' },
  { code: 'ru-RU',    name: 'Russian',                nativeName: 'Русский',        countryCode: 'RU', translatorCode: 'ru' },
  { code: 'ja-JP',    name: 'Japanese',               nativeName: '日本語',          countryCode: 'JP', translatorCode: 'ja' },
  { code: 'zh-Hans',  name: 'Chinese (Simplified)',   nativeName: '中文（简体）',     countryCode: 'CN', translatorCode: 'zh-Hans' },
  { code: 'ko-KR',    name: 'Korean',                 nativeName: '한국어',          countryCode: 'KR', translatorCode: 'ko' },
]

/**
 * Fallback display names for all Azure Translator codes not in LANGUAGES.
 * Used when translations were auto-created for non-SEO languages.
 */
export const AZURE_TRANSLATOR_DISPLAY_NAMES: Record<string, string> = {
  'af': 'Afrikaans', 'am': 'Amharic', 'ar': 'Arabic', 'as': 'Assamese',
  'az': 'Azerbaijani', 'ba': 'Bashkir', 'be': 'Belarusian', 'bg': 'Bulgarian',
  'bho': 'Bhojpuri', 'bn': 'Bangla', 'bo': 'Tibetan', 'brx': 'Bodo',
  'bs': 'Bosnian', 'ca': 'Catalan', 'cs': 'Czech', 'cy': 'Welsh',
  'da': 'Danish', 'de': 'German', 'doi': 'Dogri', 'dsb': 'Lower Sorbian',
  'dv': 'Divehi', 'el': 'Greek', 'en': 'English', 'es': 'Spanish',
  'et': 'Estonian', 'eu': 'Basque', 'fa': 'Persian', 'fi': 'Finnish',
  'fil': 'Filipino', 'fj': 'Fijian', 'fo': 'Faroese', 'fr': 'French',
  'fr-CA': 'French (Canada)', 'ga': 'Irish', 'gl': 'Galician', 'gom': 'Konkani',
  'gu': 'Gujarati', 'ha': 'Hausa', 'he': 'Hebrew', 'hi': 'Hindi',
  'hne': 'Chhattisgarhi', 'hr': 'Croatian', 'hsb': 'Upper Sorbian', 'ht': 'Haitian Creole',
  'hu': 'Hungarian', 'hy': 'Armenian', 'id': 'Indonesian', 'ig': 'Igbo',
  'ikt': 'Inuinnaqtun', 'is': 'Icelandic', 'it': 'Italian', 'iu': 'Inuktitut',
  'iu-Latn': 'Inuktitut (Latin)', 'ja': 'Japanese', 'ka': 'Georgian', 'kk': 'Kazakh',
  'km': 'Khmer', 'kmr': 'Kurdish (Northern)', 'kn': 'Kannada', 'ko': 'Korean',
  'ks': 'Kashmiri', 'ku': 'Kurdish (Central)', 'ky': 'Kyrgyz', 'lb': 'Luxembourgish',
  'ln': 'Lingala', 'lo': 'Lao', 'lt': 'Lithuanian', 'lug': 'Ganda',
  'lv': 'Latvian', 'lzh': 'Chinese (Literary)', 'mai': 'Maithili', 'mg': 'Malagasy',
  'mi': 'Māori', 'mk': 'Macedonian', 'ml': 'Malayalam', 'mn-Cyrl': 'Mongolian (Cyrillic)',
  'mn-Mong': 'Mongolian (Traditional)', 'mni': 'Meitei', 'mr': 'Marathi', 'ms': 'Malay',
  'mt': 'Maltese', 'mww': 'Hmong Daw', 'my': 'Myanmar (Burmese)', 'nb': 'Norwegian',
  'ne': 'Nepali', 'nl': 'Dutch', 'nso': 'Sesotho sa Leboa', 'nya': 'Nyanja',
  'or': 'Odia', 'otq': 'Querétaro Otomi', 'pa': 'Punjabi', 'pl': 'Polish',
  'prs': 'Dari', 'ps': 'Pashto', 'pt': 'Portuguese', 'pt-PT': 'Portuguese (Portugal)',
  'ro': 'Romanian', 'ru': 'Russian', 'run': 'Rundi', 'rw': 'Kinyarwanda',
  'sd': 'Sindhi', 'si': 'Sinhala', 'sk': 'Slovak', 'sl': 'Slovenian',
  'sm': 'Samoan', 'sn': 'Shona', 'so': 'Somali', 'sq': 'Albanian',
  'sr-Cyrl': 'Serbian (Cyrillic)', 'sr-Latn': 'Serbian (Latin)', 'st': 'Sesotho',
  'sv': 'Swedish', 'sw': 'Swahili', 'ta': 'Tamil', 'te': 'Telugu',
  'th': 'Thai', 'ti': 'Tigrinya', 'tk': 'Turkmen', 'tlh-Latn': 'Klingon (Latin)',
  'tlh-Piqd': 'Klingon (pIqaD)', 'tn': 'Setswana', 'to': 'Tongan', 'tr': 'Turkish',
  'tt': 'Tatar', 'ty': 'Tahitian', 'ug': 'Uyghur', 'uk': 'Ukrainian',
  'ur': 'Urdu', 'uz': 'Uzbek', 'vi': 'Vietnamese', 'xh': 'Xhosa',
  'yo': 'Yoruba', 'yua': 'Yucatec Maya', 'yue': 'Cantonese', 'zh-Hans': 'Chinese (Simplified)',
  'zh-Hant': 'Chinese (Traditional)', 'zu': 'Zulu',
}

/** Quick lookup map: code → LanguageMeta */
export const LANGUAGE_MAP = new Map(LANGUAGES.map((l) => [l.code, l]))

/** Quick lookup map: translatorCode → LanguageMeta */
export const TRANSLATOR_CODE_MAP = new Map(LANGUAGES.map((l) => [l.translatorCode, l]))

/** All language codes as a flat array */
export const ALL_LANGUAGE_CODES = LANGUAGES.map((l) => l.code)

/** All Azure Translator codes as a flat array */
export const ALL_TRANSLATOR_CODES = LANGUAGES.map((l) => l.translatorCode)

