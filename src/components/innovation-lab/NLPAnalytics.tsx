import {
  Globe,
  Heart,
  Tag,
  Languages,
  User,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SentimentResult } from './nlp/sentimentAnalyzer'
import type { LanguageResult } from './nlp/languageDetector'
import type { Entity, EntityResult } from './nlp/entityExtractor'
import type { TranslationResult } from './nlp/translator'
import {
  getSentimentColor,
  getSentimentEmoji,
  getLanguageFlag,
  ENTITY_COLORS,
  SUPPORTED_LANGUAGES,
} from './nlp'

interface NLPAnalyticsProps {
  sentiment: SentimentResult | null
  language: LanguageResult | null
  entities: EntityResult | null
  translation: TranslationResult | null
  targetLang: string
  onTargetLangChange: (lang: string) => void
  isAnalyzing: boolean
}

const EntityIcon = ({ type }: { type: Entity['type'] }) => {
  const iconProps = { className: 'h-3 w-3' }
  switch (type) {
    case 'person':
      return <User {...iconProps} />
    case 'place':
      return <MapPin {...iconProps} />
    case 'organization':
      return <Building2 {...iconProps} />
    case 'date':
      return <Calendar {...iconProps} />
    case 'money':
      return <DollarSign {...iconProps} />
    default:
      return <Tag {...iconProps} />
  }
}

export function NLPAnalytics({
  sentiment,
  language,
  entities,
  translation,
  targetLang,
  onTargetLangChange,
  isAnalyzing,
}: NLPAnalyticsProps) {
  // Calculate sentiment progress (convert -1 to 1 into 0 to 100)
  const sentimentProgress = sentiment ? ((sentiment.score + 1) / 2) * 100 : 50

  return (
    <div className="space-y-4">
      {/* Language Detection */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Language Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {language && language.code !== 'und' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getLanguageFlag(language.code)}</span>
                <div className="flex-1">
                  <p className="font-semibold">{language.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {language.confidence}% confidence
                  </p>
                </div>
              </div>
              <Progress value={language.confidence} className="h-2" />
              {language.alternatives.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <p className="mb-1">Other possibilities:</p>
                  <div className="flex flex-wrap gap-1">
                    {language.alternatives.map((alt) => (
                      <Badge key={alt.code} variant="outline" className="text-xs">
                        {alt.name} ({alt.confidence}%)
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isAnalyzing ? 'Detecting...' : 'Enter text to detect language'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sentiment Analysis */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Heart className="h-4 w-4 text-accent" />
            Sentiment Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {sentiment && sentiment.confidence > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getSentimentEmoji(sentiment.label)}</span>
                <div className="flex-1">
                  <p
                    className="font-semibold capitalize"
                    style={{ color: getSentimentColor(sentiment.label) }}
                  >
                    {sentiment.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Score: {(sentiment.score * 100).toFixed(0)}% • Confidence: {sentiment.confidence}%
                  </p>
                </div>
              </div>
              {/* Gradient progress bar */}
              <div className="relative h-3 rounded-full bg-gradient-to-r from-destructive via-accent to-primary overflow-hidden">
                <div
                  className="absolute top-0 h-full w-1 bg-background border border-border shadow-md transition-all duration-300"
                  style={{ left: `calc(${sentimentProgress}% - 2px)` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Negative</span>
                <span>Neutral</span>
                <span>Positive</span>
              </div>
              {/* Sentiment words */}
              {(sentiment.words.positive.length > 0 || sentiment.words.negative.length > 0) && (
                <div className="text-xs space-y-1 pt-2 border-t">
                  {sentiment.words.positive.length > 0 && (
                    <p>
                      <span className="text-primary font-medium">Positive words: </span>
                      {sentiment.words.positive.slice(0, 5).join(', ')}
                    </p>
                  )}
                  {sentiment.words.negative.length > 0 && (
                    <p>
                      <span className="text-destructive font-medium">Negative words: </span>
                      {sentiment.words.negative.slice(0, 5).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isAnalyzing ? 'Analyzing...' : 'Enter text to analyze sentiment'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Entity Extraction */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Entity Extraction
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {entities && entities.entities.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Found {entities.entities.length} entities
              </p>
              <div className="flex flex-wrap gap-2">
                {entities.entities.map((entity, idx) => (
                  <Badge
                    key={`${entity.text}-${idx}`}
                    variant="secondary"
                    className="flex items-center gap-1"
                    style={{
                      backgroundColor: `${ENTITY_COLORS[entity.type]}20`,
                      borderColor: ENTITY_COLORS[entity.type],
                      color: ENTITY_COLORS[entity.type],
                    }}
                  >
                    <EntityIcon type={entity.type} />
                    {entity.text}
                  </Badge>
                ))}
              </div>
              {/* Entity legend */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {Object.entries(entities.counts)
                  .filter(([, count]) => count > 0)
                  .map(([type, count]) => (
                    <span
                      key={type}
                      className="text-xs flex items-center gap-1"
                      style={{ color: ENTITY_COLORS[type as Entity['type']] }}
                    >
                      <EntityIcon type={type as Entity['type']} />
                      {type}: {count}
                    </span>
                  ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isAnalyzing ? 'Extracting...' : 'Enter text to extract entities'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Translation */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Languages className="h-4 w-4 text-primary" />
            Translation
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <Select value={targetLang} onValueChange={onTargetLangChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select target language" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {translation && translation.translatedText ? (
            <div className="space-y-2">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm leading-relaxed">{translation.translatedText}</p>
              </div>
              {!translation.isExactMatch && (
                <p className="text-xs text-muted-foreground italic">
                  Demo translation (word-by-word approximation)
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {isAnalyzing ? 'Translating...' : 'Enter text to translate'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
