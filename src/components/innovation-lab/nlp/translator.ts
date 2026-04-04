export interface TranslationResult {
  originalText: string
  translatedText: string
  sourceLang: string
  targetLang: string
  isExactMatch: boolean // true if found in dictionary, false if approximated
}

// Supported target languages for translation
export const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
]

// Mock translation dictionary - common phrases for demo
const TRANSLATIONS: Record<string, Record<string, string>> = {
  // English to other languages
  'hello': { es: 'hola', fr: 'bonjour', de: 'hallo', it: 'ciao', pt: 'olá' },
  'goodbye': { es: 'adiós', fr: 'au revoir', de: 'auf wiedersehen', it: 'arrivederci', pt: 'adeus' },
  'thank you': { es: 'gracias', fr: 'merci', de: 'danke', it: 'grazie', pt: 'obrigado' },
  'please': { es: 'por favor', fr: 's\'il vous plaît', de: 'bitte', it: 'per favore', pt: 'por favor' },
  'yes': { es: 'sí', fr: 'oui', de: 'ja', it: 'sì', pt: 'sim' },
  'no': { es: 'no', fr: 'non', de: 'nein', it: 'no', pt: 'não' },
  'good morning': { es: 'buenos días', fr: 'bonjour', de: 'guten morgen', it: 'buongiorno', pt: 'bom dia' },
  'good night': { es: 'buenas noches', fr: 'bonne nuit', de: 'gute nacht', it: 'buona notte', pt: 'boa noite' },
  'how are you': { es: '¿cómo estás?', fr: 'comment allez-vous?', de: 'wie geht es ihnen?', it: 'come stai?', pt: 'como está?' },
  'i love you': { es: 'te quiero', fr: 'je t\'aime', de: 'ich liebe dich', it: 'ti amo', pt: 'eu te amo' },
  'welcome': { es: 'bienvenido', fr: 'bienvenue', de: 'willkommen', it: 'benvenuto', pt: 'bem-vindo' },
  'sorry': { es: 'lo siento', fr: 'désolé', de: 'entschuldigung', it: 'scusa', pt: 'desculpe' },
  'help': { es: 'ayuda', fr: 'aide', de: 'hilfe', it: 'aiuto', pt: 'ajuda' },
  'water': { es: 'agua', fr: 'eau', de: 'wasser', it: 'acqua', pt: 'água' },
  'food': { es: 'comida', fr: 'nourriture', de: 'essen', it: 'cibo', pt: 'comida' },
  'money': { es: 'dinero', fr: 'argent', de: 'geld', it: 'soldi', pt: 'dinheiro' },
  'time': { es: 'tiempo', fr: 'temps', de: 'zeit', it: 'tempo', pt: 'tempo' },
  'today': { es: 'hoy', fr: 'aujourd\'hui', de: 'heute', it: 'oggi', pt: 'hoje' },
  'tomorrow': { es: 'mañana', fr: 'demain', de: 'morgen', it: 'domani', pt: 'amanhã' },
  'yesterday': { es: 'ayer', fr: 'hier', de: 'gestern', it: 'ieri', pt: 'ontem' },
  'friend': { es: 'amigo', fr: 'ami', de: 'freund', it: 'amico', pt: 'amigo' },
  'family': { es: 'familia', fr: 'famille', de: 'familie', it: 'famiglia', pt: 'família' },
  'work': { es: 'trabajo', fr: 'travail', de: 'arbeit', it: 'lavoro', pt: 'trabalho' },
  'home': { es: 'casa', fr: 'maison', de: 'haus', it: 'casa', pt: 'casa' },
  'city': { es: 'ciudad', fr: 'ville', de: 'stadt', it: 'città', pt: 'cidade' },
  'country': { es: 'país', fr: 'pays', de: 'land', it: 'paese', pt: 'país' },
  'world': { es: 'mundo', fr: 'monde', de: 'welt', it: 'mondo', pt: 'mundo' },
  'love': { es: 'amor', fr: 'amour', de: 'liebe', it: 'amore', pt: 'amor' },
  'life': { es: 'vida', fr: 'vie', de: 'leben', it: 'vita', pt: 'vida' },
  'day': { es: 'día', fr: 'jour', de: 'tag', it: 'giorno', pt: 'dia' },
  'night': { es: 'noche', fr: 'nuit', de: 'nacht', it: 'notte', pt: 'noite' },
  'company': { es: 'empresa', fr: 'entreprise', de: 'unternehmen', it: 'azienda', pt: 'empresa' },
  'technology': { es: 'tecnología', fr: 'technologie', de: 'technologie', it: 'tecnologia', pt: 'tecnologia' },
  'data': { es: 'datos', fr: 'données', de: 'daten', it: 'dati', pt: 'dados' },
  'artificial intelligence': { es: 'inteligencia artificial', fr: 'intelligence artificielle', de: 'künstliche intelligenz', it: 'intelligenza artificiale', pt: 'inteligência artificial' },
  'machine learning': { es: 'aprendizaje automático', fr: 'apprentissage automatique', de: 'maschinelles lernen', it: 'apprendimento automatico', pt: 'aprendizado de máquina' },
}

// Sample sentence translations for demo
const SAMPLE_SENTENCES: Record<string, Record<string, string>> = {
  'Apple Inc. announced yesterday that CEO Tim Cook will visit Paris next Monday to meet with French President Emmanuel Macron. The tech giant is expected to invest $2 billion in European data centers.': {
    es: 'Apple Inc. anunció ayer que el CEO Tim Cook visitará París el próximo lunes para reunirse con el presidente francés Emmanuel Macron. Se espera que el gigante tecnológico invierta $2 mil millones en centros de datos europeos.',
    fr: 'Apple Inc. a annoncé hier que le PDG Tim Cook visitera Paris lundi prochain pour rencontrer le président français Emmanuel Macron. Le géant technologique devrait investir 2 milliards de dollars dans des centres de données européens.',
    de: 'Apple Inc. gab gestern bekannt, dass CEO Tim Cook nächsten Montag Paris besuchen wird, um sich mit dem französischen Präsidenten Emmanuel Macron zu treffen. Der Tech-Gigant wird voraussichtlich 2 Milliarden Dollar in europäische Rechenzentren investieren.',
    it: 'Apple Inc. ha annunciato ieri che il CEO Tim Cook visiterà Parigi lunedì prossimo per incontrare il presidente francese Emmanuel Macron. Il gigante tecnologico dovrebbe investire 2 miliardi di dollari in data center europei.',
    pt: 'A Apple Inc. anunciou ontem que o CEO Tim Cook visitará Paris na próxima segunda-feira para se reunir com o presidente francês Emmanuel Macron. Espera-se que a gigante da tecnologia invista US$ 2 bilhões em data centers europeus.',
  },
  'The quick brown fox jumps over the lazy dog.': {
    es: 'El rápido zorro marrón salta sobre el perro perezoso.',
    fr: 'Le rapide renard brun saute par-dessus le chien paresseux.',
    de: 'Der schnelle braune Fuchs springt über den faulen Hund.',
    it: 'La veloce volpe marrone salta sopra il cane pigro.',
    pt: 'A rápida raposa marrom pula sobre o cachorro preguiçoso.',
  },
}

export function translate(text: string, targetLang: string): TranslationResult {
  if (!text.trim()) {
    return {
      originalText: text,
      translatedText: '',
      sourceLang: 'en',
      targetLang,
      isExactMatch: false,
    }
  }

  // Check for exact sentence match first
  const normalizedText = text.trim()
  if (SAMPLE_SENTENCES[normalizedText]?.[targetLang]) {
    return {
      originalText: text,
      translatedText: SAMPLE_SENTENCES[normalizedText][targetLang],
      sourceLang: 'en',
      targetLang,
      isExactMatch: true,
    }
  }

  // Word-by-word translation (simple approach for demo)
  const words = text.split(/\s+/)
  const translatedWords = words.map((word) => {
    const cleanWord = word.toLowerCase().replace(/[.,!?;:'"]/g, '')
    const punctuation = word.match(/[.,!?;:'"]+$/)?.[0] || ''

    if (TRANSLATIONS[cleanWord]?.[targetLang]) {
      let translated = TRANSLATIONS[cleanWord][targetLang]
      // Preserve original capitalization
      if (word[0] === word[0].toUpperCase()) {
        translated = translated.charAt(0).toUpperCase() + translated.slice(1)
      }
      return translated + punctuation
    }

    // Check multi-word phrases
    return word
  })

  // Try to translate common phrases
  let translatedText = translatedWords.join(' ')

  // Replace known phrases
  Object.keys(TRANSLATIONS).forEach((phrase) => {
    if (phrase.includes(' ') && TRANSLATIONS[phrase][targetLang]) {
      const regex = new RegExp(phrase, 'gi')
      translatedText = translatedText.replace(regex, TRANSLATIONS[phrase][targetLang])
    }
  })

  return {
    originalText: text,
    translatedText,
    sourceLang: 'en',
    targetLang,
    isExactMatch: false,
  }
}

export function getLanguageName(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code)
  return lang?.name || code
}
