import { cn } from '@/lib/utils'

export type SectionDividerVariant = 'line' | 'gradient' | 'dashed' | 'glow'

interface SectionDividerProps {
  className?: string
  variant?: SectionDividerVariant
}

const variantClasses: Record<SectionDividerVariant, string> = {
  line: 'h-px bg-border',
  gradient: 'h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent',
  dashed: 'h-px border-t border-dashed border-border bg-transparent',
  glow: 'h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent shadow-[0_0_16px_rgba(244,114,182,0.32)]',
}

export function SectionDivider({
  className,
  variant = 'line',
}: SectionDividerProps) {
  return (
    <div
      role="separator"
      aria-hidden
      className={cn('w-full', variantClasses[variant], className)}
    />
  )
}
