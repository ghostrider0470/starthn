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
  { code: 'af-ZA', name: 'Afrikaans', nativeName: 'Afrikaans', countryCode: 'ZA', translatorCode: 'af' },
  { code: 'am-ET', name: 'Amharic', nativeName: '\u12A0\u121B\u122D\u129B', countryCode: 'ET', translatorCode: 'am' },
  { code: 'ar-SA', name: 'Arabic', nativeName: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629', countryCode: 'SA', translatorCode: 'ar' },
  { code: 'as-IN', name: 'Assamese', nativeName: '\u0985\u09B8\u09AE\u09C0\u09AF\u09BC\u09BE', countryCode: 'IN', translatorCode: 'as' },
  { code: 'az-AZ', name: 'Azerbaijani', nativeName: 'Az\u0259rbaycan', countryCode: 'AZ', translatorCode: 'az' },
  { code: 'ba-RU', name: 'Bashkir', nativeName: '\u0411\u0430\u0448\u04A1\u043E\u0440\u0442', countryCode: 'RU', translatorCode: 'ba' },
  { code: 'be-BY', name: 'Belarusian', nativeName: '\u0411\u0435\u043B\u0430\u0440\u0443\u0441\u043A\u0430\u044F', countryCode: 'BY', translatorCode: 'be' },
  { code: 'bg-BG', name: 'Bulgarian', nativeName: '\u0411\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438', countryCode: 'BG', translatorCode: 'bg' },
  { code: 'bho-IN', name: 'Bhojpuri', nativeName: '\u092D\u094B\u091C\u092A\u0941\u0930\u0940', countryCode: 'IN', translatorCode: 'bho' },
  { code: 'bn-BD', name: 'Bangla', nativeName: '\u09AC\u09BE\u0982\u09B2\u09BE', countryCode: 'BD', translatorCode: 'bn' },
  { code: 'bo-CN', name: 'Tibetan', nativeName: '\u0F56\u0F7C\u0F51\u0F0B\u0F66\u0F90\u0F51', countryCode: 'CN', translatorCode: 'bo' },
  { code: 'brx-IN', name: 'Bodo', nativeName: '\u092C\u0930\u094B', countryCode: 'IN', translatorCode: 'brx' },
  { code: 'bs-BA', name: 'Bosnian', nativeName: 'Bosanski', countryCode: 'BA', translatorCode: 'bs' },
  { code: 'ca-ES', name: 'Catalan', nativeName: 'Catal\u00E0', countryCode: 'ES', translatorCode: 'ca' },
  { code: 'cs-CZ', name: 'Czech', nativeName: '\u010Ce\u0161tina', countryCode: 'CZ', translatorCode: 'cs' },
  { code: 'cy-GB', name: 'Welsh', nativeName: 'Cymraeg', countryCode: 'GB', translatorCode: 'cy' },
  { code: 'da-DK', name: 'Danish', nativeName: 'Dansk', countryCode: 'DK', translatorCode: 'da' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', countryCode: 'DE', translatorCode: 'de' },
  { code: 'doi-IN', name: 'Dogri', nativeName: '\u0921\u094B\u0917\u0930\u0940', countryCode: 'IN', translatorCode: 'doi' },
  { code: 'dsb-DE', name: 'Lower Sorbian', nativeName: 'Dolnoserb\u0161\u0107ina', countryCode: 'DE', translatorCode: 'dsb' },
  { code: 'dv-MV', name: 'Divehi', nativeName: '\u078B\u07A8\u0788\u07AC\u0780\u07A8', countryCode: 'MV', translatorCode: 'dv' },
  { code: 'el-GR', name: 'Greek', nativeName: '\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC', countryCode: 'GR', translatorCode: 'el' },
  { code: 'en-US', name: 'English', nativeName: 'English', countryCode: 'US', translatorCode: 'en' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Espa\u00F1ol', countryCode: 'ES', translatorCode: 'es' },
  { code: 'et-EE', name: 'Estonian', nativeName: 'Eesti', countryCode: 'EE', translatorCode: 'et' },
  { code: 'eu-ES', name: 'Basque', nativeName: 'Euskara', countryCode: 'ES', translatorCode: 'eu' },
  { code: 'fa-IR', name: 'Persian', nativeName: '\u0641\u0627\u0631\u0633\u06CC', countryCode: 'IR', translatorCode: 'fa' },
  { code: 'fi-FI', name: 'Finnish', nativeName: 'Suomi', countryCode: 'FI', translatorCode: 'fi' },
  { code: 'fil-PH', name: 'Filipino', nativeName: 'Filipino', countryCode: 'PH', translatorCode: 'fil' },
  { code: 'fj-FJ', name: 'Fijian', nativeName: 'Na Vosa Vakaviti', countryCode: 'FJ', translatorCode: 'fj' },
  { code: 'fo-FO', name: 'Faroese', nativeName: 'F\u00F8royskt', countryCode: 'FO', translatorCode: 'fo' },
  { code: 'fr-FR', name: 'French', nativeName: 'Fran\u00E7ais', countryCode: 'FR', translatorCode: 'fr' },
  { code: 'fr-CA', name: 'French (Canada)', nativeName: 'Fran\u00E7ais (Canada)', countryCode: 'CA', translatorCode: 'fr-CA' },
  { code: 'ga-IE', name: 'Irish', nativeName: 'Gaeilge', countryCode: 'IE', translatorCode: 'ga' },
  { code: 'gl-ES', name: 'Galician', nativeName: 'Galego', countryCode: 'ES', translatorCode: 'gl' },
  { code: 'gom-IN', name: 'Konkani', nativeName: '\u0915\u094B\u0902\u0915\u0923\u0940', countryCode: 'IN', translatorCode: 'gom' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: '\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0', countryCode: 'IN', translatorCode: 'gu' },
  { code: 'ha-NG', name: 'Hausa', nativeName: 'Hausa', countryCode: 'NG', translatorCode: 'ha' },
  { code: 'he-IL', name: 'Hebrew', nativeName: '\u05E2\u05D1\u05E8\u05D9\u05EA', countryCode: 'IL', translatorCode: 'he' },
  { code: 'hi-IN', name: 'Hindi', nativeName: '\u0939\u093F\u0928\u094D\u0926\u0940', countryCode: 'IN', translatorCode: 'hi' },
  { code: 'hne-IN', name: 'Chhattisgarhi', nativeName: '\u091B\u0924\u094D\u0924\u0940\u0938\u0917\u0922\u093C\u0940', countryCode: 'IN', translatorCode: 'hne' },
  { code: 'hr-HR', name: 'Croatian', nativeName: 'Hrvatski', countryCode: 'HR', translatorCode: 'hr' },
  { code: 'hsb-DE', name: 'Upper Sorbian', nativeName: 'Hornjoserb\u0161\u0107ina', countryCode: 'DE', translatorCode: 'hsb' },
  { code: 'ht-HT', name: 'Haitian Creole', nativeName: 'Haitian Creole', countryCode: 'HT', translatorCode: 'ht' },
  { code: 'hu-HU', name: 'Hungarian', nativeName: 'Magyar', countryCode: 'HU', translatorCode: 'hu' },
  { code: 'hy-AM', name: 'Armenian', nativeName: '\u0540\u0561\u0575\u0565\u0580\u0565\u0576', countryCode: 'AM', translatorCode: 'hy' },
  { code: 'id-ID', name: 'Indonesian', nativeName: 'Indonesia', countryCode: 'ID', translatorCode: 'id' },
  { code: 'ig-NG', name: 'Igbo', nativeName: '\u1ECA\u0300s\u1EE5\u0300 Igbo', countryCode: 'NG', translatorCode: 'ig' },
  { code: 'ikt-CA', name: 'Inuinnaqtun', nativeName: 'Inuinnaqtun', countryCode: 'CA', translatorCode: 'ikt' },
  { code: 'is-IS', name: 'Icelandic', nativeName: '\u00CDslenska', countryCode: 'IS', translatorCode: 'is' },
  { code: 'it-IT', name: 'Italian', nativeName: 'Italiano', countryCode: 'IT', translatorCode: 'it' },
  { code: 'iu-CA', name: 'Inuktitut', nativeName: '\u1403\u14C4\u1483\u144E\u1450\u1466', countryCode: 'CA', translatorCode: 'iu' },
  { code: 'iu-Latn', name: 'Inuktitut (Latin)', nativeName: 'Inuktitut (Latin)', countryCode: 'CA', translatorCode: 'iu-Latn' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '\u65E5\u672C\u8A9E', countryCode: 'JP', translatorCode: 'ja' },
  { code: 'ka-GE', name: 'Georgian', nativeName: '\u10E5\u10D0\u10E0\u10D7\u10E3\u10DA\u10D8', countryCode: 'GE', translatorCode: 'ka' },
  { code: 'kk-KZ', name: 'Kazakh', nativeName: '\u049A\u0430\u0437\u0430\u049B', countryCode: 'KZ', translatorCode: 'kk' },
  { code: 'km-KH', name: 'Khmer', nativeName: '\u1781\u17D2\u1798\u17C2\u179A', countryCode: 'KH', translatorCode: 'km' },
  { code: 'kmr-TR', name: 'Kurdish (Northern)', nativeName: 'Kurmanc\u00EE', countryCode: 'TR', translatorCode: 'kmr' },
  { code: 'kn-IN', name: 'Kannada', nativeName: '\u0C95\u0CA8\u0CCD\u0CA8\u0CA1', countryCode: 'IN', translatorCode: 'kn' },
  { code: 'ko-KR', name: 'Korean', nativeName: '\uD55C\uAD6D\uC5B4', countryCode: 'KR', translatorCode: 'ko' },
  { code: 'ks-IN', name: 'Kashmiri', nativeName: '\u0915\u0936\u094D\u092E\u0940\u0930\u0940', countryCode: 'IN', translatorCode: 'ks' },
  { code: 'ku-IQ', name: 'Kurdish (Central)', nativeName: 'Kurd\u00EE (Navend\u00EE)', countryCode: 'IQ', translatorCode: 'ku' },
  { code: 'ky-KG', name: 'Kyrgyz', nativeName: '\u041A\u044B\u0440\u0433\u044B\u0437\u0447\u0430', countryCode: 'KG', translatorCode: 'ky' },
  { code: 'lb-LU', name: 'Luxembourgish', nativeName: 'L\u00EBtzebuergesch', countryCode: 'LU', translatorCode: 'lb' },
  { code: 'ln-CD', name: 'Lingala', nativeName: 'Ling\u00E1la', countryCode: 'CD', translatorCode: 'ln' },
  { code: 'lo-LA', name: 'Lao', nativeName: '\u0EA5\u0EB2\u0EA7', countryCode: 'LA', translatorCode: 'lo' },
  { code: 'lt-LT', name: 'Lithuanian', nativeName: 'Lietuvi\u0173', countryCode: 'LT', translatorCode: 'lt' },
  { code: 'lug-UG', name: 'Ganda', nativeName: 'Luganda', countryCode: 'UG', translatorCode: 'lug' },
  { code: 'lv-LV', name: 'Latvian', nativeName: 'Latvie\u0161u', countryCode: 'LV', translatorCode: 'lv' },
  { code: 'lzh-CN', name: 'Chinese (Literary)', nativeName: '\u6587\u8A00\u6587', countryCode: 'CN', translatorCode: 'lzh' },
  { code: 'mai-IN', name: 'Maithili', nativeName: '\u092E\u0948\u0925\u093F\u0932\u0940', countryCode: 'IN', translatorCode: 'mai' },
  { code: 'mg-MG', name: 'Malagasy', nativeName: 'Malagasy', countryCode: 'MG', translatorCode: 'mg' },
  { code: 'mi-NZ', name: 'M\u0101ori', nativeName: 'Te Reo M\u0101ori', countryCode: 'NZ', translatorCode: 'mi' },
  { code: 'mk-MK', name: 'Macedonian', nativeName: '\u041C\u0430\u043A\u0435\u0434\u043E\u043D\u0441\u043A\u0438', countryCode: 'MK', translatorCode: 'mk' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: '\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02', countryCode: 'IN', translatorCode: 'ml' },
  { code: 'mn-Cyrl', name: 'Mongolian (Cyrillic)', nativeName: '\u041C\u043E\u043D\u0433\u043E\u043B', countryCode: 'MN', translatorCode: 'mn-Cyrl' },
  { code: 'mn-Mong', name: 'Mongolian (Traditional)', nativeName: '\u182E\u1823\u1829\u182D\u1823\u182F', countryCode: 'MN', translatorCode: 'mn-Mong' },
  { code: 'mni-IN', name: 'Manipuri', nativeName: '\u09AE\u09C8\u09A4\u09C8\u09B2\u09CB\u09A8', countryCode: 'IN', translatorCode: 'mni' },
  { code: 'mr-IN', name: 'Marathi', nativeName: '\u092E\u0930\u093E\u0920\u0940', countryCode: 'IN', translatorCode: 'mr' },
  { code: 'ms-MY', name: 'Malay', nativeName: 'Melayu', countryCode: 'MY', translatorCode: 'ms' },
  { code: 'mt-MT', name: 'Maltese', nativeName: 'Malti', countryCode: 'MT', translatorCode: 'mt' },
  { code: 'mww', name: 'Hmong Daw', nativeName: 'Hmong Daw', countryCode: null, translatorCode: 'mww' },
  { code: 'my-MM', name: 'Myanmar (Burmese)', nativeName: '\u1019\u103C\u1014\u103A\u1019\u102C', countryCode: 'MM', translatorCode: 'my' },
  { code: 'nb-NO', name: 'Norwegian', nativeName: 'Norsk Bokm\u00E5l', countryCode: 'NO', translatorCode: 'nb' },
  { code: 'ne-NP', name: 'Nepali', nativeName: '\u0928\u0947\u092A\u093E\u0932\u0940', countryCode: 'NP', translatorCode: 'ne' },
  { code: 'nl-NL', name: 'Dutch', nativeName: 'Nederlands', countryCode: 'NL', translatorCode: 'nl' },
  { code: 'nso-ZA', name: 'Sesotho sa Leboa', nativeName: 'Sesotho sa Leboa', countryCode: 'ZA', translatorCode: 'nso' },
  { code: 'nya-MW', name: 'Nyanja', nativeName: 'Nyanja', countryCode: 'MW', translatorCode: 'nya' },
  { code: 'or-IN', name: 'Odia', nativeName: '\u0B13\u0B21\u0B3C\u0B3F\u0B06', countryCode: 'IN', translatorCode: 'or' },
  { code: 'otq-MX', name: 'Quer\u00E9taro Otomi', nativeName: 'H\u00F1\u00E4h\u00F1u', countryCode: 'MX', translatorCode: 'otq' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: '\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40', countryCode: 'IN', translatorCode: 'pa' },
  { code: 'pl-PL', name: 'Polish', nativeName: 'Polski', countryCode: 'PL', translatorCode: 'pl' },
  { code: 'prs-AF', name: 'Dari', nativeName: '\u062F\u0631\u06CC', countryCode: 'AF', translatorCode: 'prs' },
  { code: 'ps-AF', name: 'Pashto', nativeName: '\u067E\u069A\u062A\u0648', countryCode: 'AF', translatorCode: 'ps' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Portugu\u00EAs (Brasil)', countryCode: 'BR', translatorCode: 'pt' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)', nativeName: 'Portugu\u00EAs (Portugal)', countryCode: 'PT', translatorCode: 'pt-PT' },
  { code: 'ro-RO', name: 'Romanian', nativeName: 'Rom\u00E2n\u0103', countryCode: 'RO', translatorCode: 'ro' },
  { code: 'ru-RU', name: 'Russian', nativeName: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', countryCode: 'RU', translatorCode: 'ru' },
  { code: 'run-BI', name: 'Rundi', nativeName: 'Ikirundi', countryCode: 'BI', translatorCode: 'run' },
  { code: 'rw-RW', name: 'Kinyarwanda', nativeName: 'Kinyarwanda', countryCode: 'RW', translatorCode: 'rw' },
  { code: 'sd-PK', name: 'Sindhi', nativeName: '\u0633\u0646\u068C\u064A', countryCode: 'PK', translatorCode: 'sd' },
  { code: 'si-LK', name: 'Sinhala', nativeName: '\u0DC3\u0DD2\u0D82\u0DC4\u0DBD', countryCode: 'LK', translatorCode: 'si' },
  { code: 'sk-SK', name: 'Slovak', nativeName: 'Sloven\u010Dina', countryCode: 'SK', translatorCode: 'sk' },
  { code: 'sl-SI', name: 'Slovenian', nativeName: 'Sloven\u0161\u010Dina', countryCode: 'SI', translatorCode: 'sl' },
  { code: 'sm-WS', name: 'Samoan', nativeName: 'Gagana S\u0101moa', countryCode: 'WS', translatorCode: 'sm' },
  { code: 'sn-ZW', name: 'Shona', nativeName: 'chiShona', countryCode: 'ZW', translatorCode: 'sn' },
  { code: 'so-SO', name: 'Somali', nativeName: 'Soomaali', countryCode: 'SO', translatorCode: 'so' },
  { code: 'sq-AL', name: 'Albanian', nativeName: 'Shqip', countryCode: 'AL', translatorCode: 'sq' },
  { code: 'sr-Cyrl', name: 'Serbian (Cyrillic)', nativeName: '\u0421\u0440\u043F\u0441\u043A\u0438 (\u045B\u0438\u0440\u0438\u043B\u0438\u0446\u0430)', countryCode: 'RS', translatorCode: 'sr-Cyrl' },
  { code: 'sr-Latn', name: 'Serbian (Latin)', nativeName: 'Srpski (latinica)', countryCode: 'RS', translatorCode: 'sr-Latn' },
  { code: 'st-ZA', name: 'Sesotho', nativeName: 'Sesotho', countryCode: 'ZA', translatorCode: 'st' },
  { code: 'sv-SE', name: 'Swedish', nativeName: 'Svenska', countryCode: 'SE', translatorCode: 'sv' },
  { code: 'sw-TZ', name: 'Swahili', nativeName: 'Kiswahili', countryCode: 'TZ', translatorCode: 'sw' },
  { code: 'ta-IN', name: 'Tamil', nativeName: '\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD', countryCode: 'IN', translatorCode: 'ta' },
  { code: 'te-IN', name: 'Telugu', nativeName: '\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41', countryCode: 'IN', translatorCode: 'te' },
  { code: 'th-TH', name: 'Thai', nativeName: '\u0E44\u0E17\u0E22', countryCode: 'TH', translatorCode: 'th' },
  { code: 'ti-ER', name: 'Tigrinya', nativeName: '\u1275\u130D\u122D\u129B', countryCode: 'ER', translatorCode: 'ti' },
  { code: 'tk-TM', name: 'Turkmen', nativeName: 'T\u00FCrkmen Dili', countryCode: 'TM', translatorCode: 'tk' },
  { code: 'tlh-Latn', name: 'Klingon (Latin)', nativeName: 'Klingon', countryCode: null, translatorCode: 'tlh-Latn' },
  { code: 'tlh-Piqd', name: 'Klingon (pIqaD)', nativeName: 'Klingon (pIqaD)', countryCode: null, translatorCode: 'tlh-Piqd' },
  { code: 'tn-ZA', name: 'Setswana', nativeName: 'Setswana', countryCode: 'ZA', translatorCode: 'tn' },
  { code: 'to-TO', name: 'Tongan', nativeName: 'Lea Fakatonga', countryCode: 'TO', translatorCode: 'to' },
  { code: 'tr-TR', name: 'Turkish', nativeName: 'T\u00FCrk\u00E7e', countryCode: 'TR', translatorCode: 'tr' },
  { code: 'tt-RU', name: 'Tatar', nativeName: '\u0422\u0430\u0442\u0430\u0440', countryCode: 'RU', translatorCode: 'tt' },
  { code: 'ty-PF', name: 'Tahitian', nativeName: 'Reo Tahiti', countryCode: 'PF', translatorCode: 'ty' },
  { code: 'ug-CN', name: 'Uyghur', nativeName: '\u0626\u06C7\u064A\u063A\u06C7\u0631\u0686\u06D5', countryCode: 'CN', translatorCode: 'ug' },
  { code: 'uk-UA', name: 'Ukrainian', nativeName: '\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430', countryCode: 'UA', translatorCode: 'uk' },
  { code: 'ur-PK', name: 'Urdu', nativeName: '\u0627\u0631\u062F\u0648', countryCode: 'PK', translatorCode: 'ur' },
  { code: 'uz-UZ', name: 'Uzbek', nativeName: 'Uzbek', countryCode: 'UZ', translatorCode: 'uz' },
  { code: 'vi-VN', name: 'Vietnamese', nativeName: 'Ti\u1EBFng Vi\u1EC7t', countryCode: 'VN', translatorCode: 'vi' },
  { code: 'xh-ZA', name: 'Xhosa', nativeName: 'isiXhosa', countryCode: 'ZA', translatorCode: 'xh' },
  { code: 'yo-NG', name: 'Yoruba', nativeName: '\u00C8d\u00E8 Yor\u00F9b\u00E1', countryCode: 'NG', translatorCode: 'yo' },
  { code: 'yua-MX', name: 'Yucatec Maya', nativeName: 'Yucatec Maya', countryCode: 'MX', translatorCode: 'yua' },
  { code: 'yue-HK', name: 'Cantonese', nativeName: '\u7CB5\u8A9E', countryCode: 'HK', translatorCode: 'yue' },
  { code: 'zh-Hans', name: 'Chinese (Simplified)', nativeName: '\u4E2D\u6587 (\u7B80\u4F53)', countryCode: 'CN', translatorCode: 'zh-Hans' },
  { code: 'zh-Hant', name: 'Chinese (Traditional)', nativeName: '\u4E2D\u6587 (\u7E41\u9AD4)', countryCode: 'TW', translatorCode: 'zh-Hant' },
  { code: 'zu-ZA', name: 'Zulu', nativeName: 'isiZulu', countryCode: 'ZA', translatorCode: 'zu' },
]

/** Quick lookup map: code → LanguageMeta */
export const LANGUAGE_MAP = new Map(LANGUAGES.map((l) => [l.code, l]))

/** Quick lookup map: translatorCode → LanguageMeta */
export const TRANSLATOR_CODE_MAP = new Map(LANGUAGES.map((l) => [l.translatorCode, l]))

/** All language codes as a flat array */
export const ALL_LANGUAGE_CODES = LANGUAGES.map((l) => l.code)

/** All Azure Translator codes as a flat array */
export const ALL_TRANSLATOR_CODES = LANGUAGES.map((l) => l.translatorCode)

