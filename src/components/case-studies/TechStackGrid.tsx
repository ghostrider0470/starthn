import { StandardCard } from '@/components/ui/standard-card'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface TechStackGridProps {
  techStack: string[]
}

export function TechStackGrid({ techStack }: TechStackGridProps) {
  return (
    <div
      className={cn(
        designSystem.grid.responsive.four,
        designSystem.spacing.gap.md,
      )}
    >
      {techStack.map((technology) => (
        <StandardCard
          key={technology}
          variant="hover"
          padding="compact"
          className="h-full border-muted/60"
        >
          <div className="flex min-h-16 items-center justify-center text-center">
            <p
              className={cn(
                designSystem.typography.body.small,
                'font-semibold',
              )}
            >
              {technology}
            </p>
          </div>
        </StandardCard>
      ))}
    </div>
  )
}
