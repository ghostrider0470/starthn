import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquareText } from 'lucide-react'
import { NLPInput } from './NLPInput'
import { NLPAnalytics } from './NLPAnalytics'
import {
  analyzeSentiment,
  detectLanguage,
  extractEntities,
  translate,
} from './nlp'
import type { SentimentResult } from './nlp/sentimentAnalyzer'
import type { LanguageResult } from './nlp/languageDetector'
import type { EntityResult } from './nlp/entityExtractor'
import type { TranslationResult } from './nlp/translator'

const DEBOUNCE_DELAY = 300

export function NLPDemo() {
  const [text, setText] = useState('')
  const [targetLang, setTargetLang] = useState('es')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Analysis results
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null)
  const [language, setLanguage] = useState<LanguageResult | null>(null)
  const [entities, setEntities] = useState<EntityResult | null>(null)
  const [translation, setTranslation] = useState<TranslationResult | null>(null)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Analyze text with debounce
  const analyzeText = useCallback(
    (inputText: string) => {
      if (!inputText.trim()) {
        setSentiment(null)
        setLanguage(null)
        setEntities(null)
        setTranslation(null)
        return
      }

      setIsAnalyzing(true)

      // Run analysis (simulated async for UX)
      setTimeout(() => {
        const sentimentResult = analyzeSentiment(inputText)
        const languageResult = detectLanguage(inputText)
        const entitiesResult = extractEntities(inputText)
        const translationResult = translate(inputText, targetLang)

        setSentiment(sentimentResult)
        setLanguage(languageResult)
        setEntities(entitiesResult)
        setTranslation(translationResult)
        setIsAnalyzing(false)
      }, 100)
    },
    [targetLang]
  )

  // Debounced text change handler
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      analyzeText(text)
    }, DEBOUNCE_DELAY)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [text, analyzeText])

  // Re-translate when target language changes
  useEffect(() => {
    if (text.trim()) {
      const translationResult = translate(text, targetLang)
      setTranslation(translationResult)
    }
  }, [targetLang, text])

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Input Panel */}
      <div className="flex-1 min-w-0">
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-primary" />
              Text Input
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NLPInput
              value={text}
              onChange={setText}
              isAnalyzing={isAnalyzing}
            />
          </CardContent>
        </Card>
      </div>

      {/* Analytics Panel */}
      <div className="w-full lg:w-[340px] shrink-0">
        <NLPAnalytics
          sentiment={sentiment}
          language={language}
          entities={entities}
          translation={translation}
          targetLang={targetLang}
          onTargetLangChange={setTargetLang}
          isAnalyzing={isAnalyzing}
        />
      </div>
    </div>
  )
}
