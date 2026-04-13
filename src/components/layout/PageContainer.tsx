import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  as?: 'div' | 'section' | 'main'
  spacing?: 'none' | 'sm' | 'md' | 'lg'
}

const maxWidthClasses = {
  sm: 'max-w-3xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  '2xl': 'max-w-7xl',
  full: 'max-w-full',
}

const spacingClasses = {
  none: '',
  sm: designSystem.spacing.page.sectionCompact,
  md: designSystem.spacing.page.section,
  lg: designSystem.spacing.page.sectionLarge,
}

export function PageContainer({
  children,
  className,
  maxWidth = 'xl',
  as: Component = 'div',
  spacing = 'md',
}: PageContainerProps) {
  return (
    <Component
      className={cn(
        designSystem.spacing.page.container,
        spacingClasses[spacing],
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </Component>
  )
}
