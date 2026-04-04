export { analyzeSentiment, getSentimentColor, getSentimentEmoji } from './sentimentAnalyzer'
export type { SentimentResult } from './sentimentAnalyzer'

export { detectLanguage, getLanguageFlag } from './languageDetector'
export type { LanguageResult } from './languageDetector'

export { extractEntities, ENTITY_COLORS, getEntityIcon } from './entityExtractor'
export type { Entity, EntityResult } from './entityExtractor'

export { translate, SUPPORTED_LANGUAGES, getLanguageName } from './translator'
export type { TranslationResult } from './translator'
