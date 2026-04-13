import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface StandardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: React.ReactNode
  title?: string
  description?: string
  children: React.ReactNode
  media?: React.ReactNode
  footer?: React.ReactNode
  headerAction?: React.ReactNode
  variant?: 'default' | 'hover' | 'interactive' | 'muted' | 'accent' | 'gradient'
  padding?: 'default' | 'compact' | 'none'
  className?: string
  headerClassName?: string
  titleClassName?: string
  descriptionClassName?: string
  contentClassName?: string
  footerClassName?: string
}

const variantClasses = {
  default: designSystem.effects.card.base,
  hover: cn(designSystem.effects.card.base, designSystem.effects.card.hover),
  interactive: cn(designSystem.effects.card.base, designSystem.effects.card.interactive),
  muted: cn(designSystem.effects.card.base, designSystem.effects.card.muted),
  accent: cn(designSystem.effects.card.base, designSystem.effects.card.accent),
  gradient: cn(designSystem.effects.card.base, designSystem.surfaces.card.gradient),
}

const paddingClasses = {
  default: designSystem.spacing.component.card,
  compact: designSystem.spacing.component.cardCompact,
  none: '',
}

export function StandardCard({
  eyebrow,
  title,
  description,
  children,
  media,
  footer,
  headerAction,
  variant = 'default',
  padding = 'default',
  className,
  headerClassName,
  titleClassName,
  descriptionClassName,
  contentClassName,
  footerClassName,
  ...props
}: StandardCardProps) {
  const showHeader = eyebrow || title || description || headerAction

  if (!showHeader && !footer && !media) {
    return (
      <Card className={cn(variantClasses[variant], className)} {...props}>
        <CardContent className={cn(paddingClasses[padding], contentClassName)}>
          {children}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(variantClasses[variant], className)} {...props}>
      {media}
      {showHeader && (
        <CardHeader className={cn(padding === 'compact' && 'pb-3', headerClassName)}>
          {eyebrow && (
            <div className={designSystem.typography.display.eyebrow}>{eyebrow}</div>
          )}
          {title && (
            <CardTitle className={cn(designSystem.typography.heading.h4, titleClassName)}>
              {title}
            </CardTitle>
          )}
          {description && (
            <CardDescription className={cn(designSystem.typography.body.small, descriptionClassName)}>
              {description}
            </CardDescription>
          )}
          {headerAction && <CardAction>{headerAction}</CardAction>}
        </CardHeader>
      )}
      <CardContent
        className={cn(
          padding !== 'none' && paddingClasses[padding],
          showHeader && padding !== 'none' && 'pt-0',
          contentClassName
        )}
      >
        {children}
      </CardContent>
      {footer && (
        <CardFooter
          className={cn(
            padding !== 'none' && paddingClasses[padding],
            padding !== 'none' && 'pt-0',
            footerClassName
          )}
        >
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}
