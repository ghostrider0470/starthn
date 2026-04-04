import Sentiment from 'sentiment'

export interface SentimentResult {
  score: number // -1 to 1 normalized
  label: 'positive' | 'negative' | 'neutral'
  confidence: number // 0-100
  comparative: number // raw comparative score
  words: {
    positive: string[]
    negative: string[]
  }
}

const sentiment = new Sentiment()

export function analyzeSentiment(text: string): SentimentResult {
  if (!text.trim()) {
    return {
      score: 0,
      label: 'neutral',
      confidence: 0,
      comparative: 0,
      words: { positive: [], negative: [] },
    }
  }

  const result = sentiment.analyze(text)

  // Normalize score to -1 to 1 range
  // Comparative is already normalized by word count
  const normalizedScore = Math.max(-1, Math.min(1, result.comparative))

  // Determine label based on score thresholds
  let label: 'positive' | 'negative' | 'neutral'
  if (normalizedScore > 0.05) {
    label = 'positive'
  } else if (normalizedScore < -0.05) {
    label = 'negative'
  } else {
    label = 'neutral'
  }

  // Calculate confidence based on the strength of sentiment words found
  // More sentiment words = higher confidence
  const totalSentimentWords = result.positive.length + result.negative.length
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length
  const sentimentDensity = wordCount > 0 ? totalSentimentWords / wordCount : 0

  // Confidence is based on both the absolute score and sentiment density
  const scoreStrength = Math.abs(normalizedScore)
  const confidence = Math.min(100, Math.round((scoreStrength * 50 + sentimentDensity * 50) * 100))

  return {
    score: normalizedScore,
    label,
    confidence,
    comparative: result.comparative,
    words: {
      positive: result.positive,
      negative: result.negative,
    },
  }
}

// Get sentiment color for UI
export function getSentimentColor(label: 'positive' | 'negative' | 'neutral'): string {
  switch (label) {
    case 'positive':
      return '#22c55e' // green-500
    case 'negative':
      return '#ef4444' // red-500
    case 'neutral':
      return '#f59e0b' // amber-500
  }
}

// Get sentiment emoji for UI
export function getSentimentEmoji(label: 'positive' | 'negative' | 'neutral'): string {
  switch (label) {
    case 'positive':
      return '😊'
    case 'negative':
      return '😔'
    case 'neutral':
      return '😐'
  }
}
