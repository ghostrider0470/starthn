import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { StandardCard } from '@/components/ui/standard-card'

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: string
    direction?: 'up' | 'down' | 'neutral'
  }
  align?: 'left' | 'center'
  variant?: 'default' | 'accent' | 'subtle'
}

const variantClasses = {
  default: '',
  accent: designSystem.surfaces.card.accent,
  subtle: designSystem.surfaces.card.subtle,
}

export function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  trend,
  align = 'left',
  variant = 'default',
  className,
  ...props
}: MetricCardProps) {
  const isCentered = align === 'center'
  const trendDirection = trend?.direction ?? 'neutral'
  const TrendIcon = trendDirection === 'down' ? TrendingDown : TrendingUp

  return (
    <StandardCard
      variant="hover"
      className={cn(
        'h-full',
        variantClasses[variant],
        isCentered && 'text-center',
        className
      )}
      {...props}
    >
      <div className={cn('flex items-start gap-3', isCentered && 'justify-center')}>
        {Icon && (
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Icon className={designSystem.icons.size.lg} aria-hidden />
          </div>
        )}
        <div className={cn('min-w-0', isCentered && 'flex flex-col items-center')}>
          <p className={cn(designSystem.typography.heading.h3, 'text-primary')}>
            {value}
          </p>
          <p className={cn(designSystem.typography.body.small, 'mt-1')}>{label}</p>
          {description && (
            <p className={cn(designSystem.typography.body.small, designSystem.typography.muted, 'mt-1')}>
              {description}
            </p>
          )}
          {trend && (
            <p
              className={cn(
                'mt-2 inline-flex items-center gap-1 text-xs font-medium',
                trendDirection === 'up' && 'text-primary',
                trendDirection === 'down' && 'text-destructive',
                trendDirection === 'neutral' && 'text-muted-foreground'
              )}
            >
              <TrendIcon className={designSystem.icons.size.xs} aria-hidden />
              {trend.value}
            </p>
          )}
        </div>
      </div>
    </StandardCard>
  )
}
