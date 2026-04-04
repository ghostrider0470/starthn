import { Eraser } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

interface NLPInputProps {
  value: string
  onChange: (value: string) => void
  isAnalyzing?: boolean
}

const SAMPLE_TEXTS = {
  en: {
    label: 'English',
    flag: '🇬🇧',
    text: 'Apple Inc. announced yesterday that CEO Tim Cook will visit Paris next Monday to meet with French President Emmanuel Macron. The tech giant is expected to invest $2 billion in European data centers.',
  },
  es: {
    label: 'Spanish',
    flag: '🇪🇸',
    text: 'La empresa tecnológica Google anunció ayer que expandirá sus operaciones en Madrid. El director ejecutivo Sundar Pichai visitará España el próximo mes.',
  },
  fr: {
    label: 'French',
    flag: '🇫🇷',
    text: 'Le président Emmanuel Macron a rencontré la chancelière allemande à Berlin. Les discussions portaient sur l\'avenir de l\'Union européenne.',
  },
  de: {
    label: 'German',
    flag: '🇩🇪',
    text: 'Die Deutsche Bank hat heute bekannt gegeben, dass sie 500 Millionen Euro in neue Technologien investieren wird.',
  },
  mixed: {
    label: 'Mixed',
    flag: '🌍',
    text: 'I absolutely love this product! The quality is amazing and the customer service team was incredibly helpful. Best purchase I\'ve made this year. Highly recommend to everyone!',
  },
}

export function NLPInput({ value, onChange, isAnalyzing }: NLPInputProps) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
  const charCount = value.length

  return (
    <div className="space-y-4">
      {/* Textarea */}
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter or paste text to analyze..."
          className="min-h-[200px] resize-none text-base leading-relaxed"
          disabled={isAnalyzing}
        />
        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-11 w-11 text-muted-foreground hover:text-foreground"
            onClick={() => onChange('')}
          >
            <Eraser className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Word/Character count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {wordCount} {wordCount === 1 ? 'word' : 'words'} • {charCount} characters
        </span>
        {isAnalyzing && (
          <span className="text-primary animate-pulse">Analyzing...</span>
        )}
      </div>

      {/* Sample texts */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Try a sample text:</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SAMPLE_TEXTS).map(([key, { label, flag, text }]) => (
            <Badge
              key={key}
              variant="outline"
              className="min-h-11 cursor-pointer px-3 py-2 transition-colors hover:bg-primary hover:text-primary-foreground"
              onClick={() => onChange(text)}
            >
              {flag} {label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
