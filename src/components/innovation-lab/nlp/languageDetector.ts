import { franc, francAll } from 'franc'

export interface LanguageResult {
  code: string
  name: string
  confidence: number // 0-100
  alternatives: Array<{ code: string; name: string; confidence: number }>
}

// ISO 639-3 to language name mapping for common languages
const LANGUAGE_NAMES: Record<string, string> = {
  eng: 'English',
  spa: 'Spanish',
  fra: 'French',
  deu: 'German',
  ita: 'Italian',
  por: 'Portuguese',
  nld: 'Dutch',
  rus: 'Russian',
  jpn: 'Japanese',
  cmn: 'Chinese (Mandarin)',
  zho: 'Chinese',
  kor: 'Korean',
  ara: 'Arabic',
  hin: 'Hindi',
  tur: 'Turkish',
  pol: 'Polish',
  ukr: 'Ukrainian',
  vie: 'Vietnamese',
  tha: 'Thai',
  swe: 'Swedish',
  dan: 'Danish',
  nor: 'Norwegian',
  fin: 'Finnish',
  ces: 'Czech',
  ell: 'Greek',
  heb: 'Hebrew',
  ind: 'Indonesian',
  msa: 'Malay',
  ron: 'Romanian',
  hun: 'Hungarian',
  und: 'Unknown',
}

// ISO 639-3 to ISO 639-1 (2-letter codes) for flags
const ISO3_TO_ISO1: Record<string, string> = {
  eng: 'en',
  spa: 'es',
  fra: 'fr',
  deu: 'de',
  ita: 'it',
  por: 'pt',
  nld: 'nl',
  rus: 'ru',
  jpn: 'ja',
  cmn: 'zh',
  zho: 'zh',
  kor: 'ko',
  ara: 'ar',
  hin: 'hi',
  tur: 'tr',
  pol: 'pl',
  ukr: 'uk',
  vie: 'vi',
  tha: 'th',
  swe: 'sv',
  dan: 'da',
  nor: 'no',
  fin: 'fi',
  ces: 'cs',
  ell: 'el',
  heb: 'he',
  ind: 'id',
  msa: 'ms',
  ron: 'ro',
  hun: 'hu',
}

export function detectLanguage(text: string): LanguageResult {
  if (!text.trim() || text.trim().length < 10) {
    return {
      code: 'und',
      name: 'Unknown',
      confidence: 0,
      alternatives: [],
    }
  }

  // Get top 3 language predictions
  const results = francAll(text, { minLength: 3, only: Object.keys(LANGUAGE_NAMES) })

  if (results.length === 0 || results[0][0] === 'und') {
    return {
      code: 'und',
      name: 'Unknown',
      confidence: 0,
      alternatives: [],
    }
  }

  // franc returns scores, not probabilities - convert to confidence
  // Higher score = more confident. Top score is typically 1.0
  const topScore = results[0][1]
  const topCode = results[0][0]

  // Convert score to confidence percentage
  // franc scores range from 0 to 1, with 1 being most confident
  const confidence = Math.round(topScore * 100)

  // Get alternatives (next 2 most likely)
  const alternatives = results.slice(1, 4).map(([code, score]) => ({
    code: ISO3_TO_ISO1[code] || code,
    name: LANGUAGE_NAMES[code] || code,
    confidence: Math.round(score * 100),
  }))

  return {
    code: ISO3_TO_ISO1[topCode] || topCode,
    name: LANGUAGE_NAMES[topCode] || topCode,
    confidence,
    alternatives,
  }
}

// Get language flag emoji (using regional indicator symbols)
export function getLanguageFlag(code: string): string {
  const flags: Record<string, string> = {
    en: '🇬🇧',
    es: '🇪🇸',
    fr: '🇫🇷',
    de: '🇩🇪',
    it: '🇮🇹',
    pt: '🇵🇹',
    nl: '🇳🇱',
    ru: '🇷🇺',
    ja: '🇯🇵',
    zh: '🇨🇳',
    ko: '🇰🇷',
    ar: '🇸🇦',
    hi: '🇮🇳',
    tr: '🇹🇷',
    pl: '🇵🇱',
    uk: '🇺🇦',
    vi: '🇻🇳',
    th: '🇹🇭',
    sv: '🇸🇪',
    da: '🇩🇰',
    no: '🇳🇴',
    fi: '🇫🇮',
    cs: '🇨🇿',
    el: '🇬🇷',
    he: '🇮🇱',
    id: '🇮🇩',
    ms: '🇲🇾',
    ro: '🇷🇴',
    hu: '🇭🇺',
  }
  return flags[code] || '🌍'
}
