import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TechBadgeProps {
  label: string
  icon?: LucideIcon
  tone?: 'default' | 'subtle' | 'accent' | 'custom'
  size?: 'sm' | 'md'
  color?: string
  className?: string
}

const toneClasses = {
  default: 'border-primary/25 bg-primary/10 text-primary',
  subtle: 'border-border bg-muted/40 text-foreground/90',
  accent: 'border-accent/25 bg-accent/10 text-accent',
  custom: '',
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
}

export function TechBadge({
  label,
  icon: Icon,
  tone = 'default',
  size = 'sm',
  color,
  className,
}: TechBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 font-medium',
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
      style={
        tone === 'custom' && color
          ? {
              borderColor: `${color}55`,
              backgroundColor: `${color}18`,
              color,
            }
          : undefined
      }
    >
      {Icon && <Icon className="h-3 w-3" aria-hidden />}
      {label}
    </Badge>
  )
}
