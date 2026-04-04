import type { CaseStudyResult } from '@/components/landing/CaseStudyCard'
import { StandardCard } from '@/components/ui/standard-card'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface ResultsMetricsProps {
  results: CaseStudyResult[]
}

export function ResultsMetrics({ results }: ResultsMetricsProps) {
  return (
    <div
      className={cn(
        designSystem.grid.responsive.three,
        designSystem.spacing.gap.lg,
      )}
    >
      {results.map((result) => (
        <StandardCard key={result.metric} variant="hover" className="h-full">
          <p
            className={cn(
              designSystem.typography.body.small,
              designSystem.typography.muted,
              'mb-2 font-medium',
            )}
          >
            {result.metric}
          </p>
          <p
            className={cn(
              designSystem.typography.heading.h2,
              'mb-3 text-primary',
            )}
          >
            {result.value}
          </p>
          <p
            className={cn(
              designSystem.typography.body.base,
              designSystem.typography.muted,
            )}
          >
            {result.description}
          </p>
        </StandardCard>
      ))}
    </div>
  )
}
