import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  fullPage?: boolean
  className?: string
}

const sizeClasses = {
  sm: {
    spinner: 'h-4 w-4',
    text: designSystem.typography.body.small,
    gap: 'gap-2',
  },
  md: {
    spinner: 'h-6 w-6',
    text: designSystem.typography.body.base,
    gap: 'gap-3',
  },
  lg: {
    spinner: 'h-8 w-8',
    text: designSystem.typography.body.large,
    gap: 'gap-4',
  },
}

export function LoadingState({
  message = 'Loading...',
  size = 'md',
  fullPage = false,
  className,
}: LoadingStateProps) {
  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        sizeClasses[size].gap,
        fullPage && 'min-h-[60vh]',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative inline-flex items-center justify-center">
        <div className="absolute h-12 w-12 rounded-full border border-primary/20 animate-ping" />
        <Loader2 className={cn(sizeClasses[size].spinner, 'relative z-10 text-primary', designSystem.animation.loading)} />
      </div>
      <p className={cn(sizeClasses[size].text, designSystem.typography.muted)}>
        {message}
      </p>

      {fullPage && (
        <div className="w-full max-w-sm space-y-3 pt-4" aria-hidden>
          <div className="h-2 rounded-full bg-muted/70" />
          <div className="h-2 w-5/6 rounded-full bg-muted/60" />
          <div className="h-2 w-2/3 rounded-full bg-muted/50" />
        </div>
      )}
    </div>
  )

  if (fullPage) {
    return (
      <div className={designSystem.spacing.page.container}>
        {content}
      </div>
    )
  }

  return content
}
