import { useId } from 'react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { SectionDivider, type SectionDividerVariant } from '@/components/ui/section-divider'

interface SectionContainerProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
  spacing?: 'sm' | 'md' | 'lg' | 'xl'
  align?: 'left' | 'center'
  background?: keyof typeof designSystem.surfaces.section
  divider?: boolean | SectionDividerVariant
  headerClassName?: string
  id?: string
}

const spacingClasses = {
  sm: designSystem.spacing.section.sm,
  md: designSystem.spacing.section.md,
  lg: designSystem.spacing.section.lg,
  xl: designSystem.spacing.section.xl,
}

export function SectionContainer({
  children,
  title,
  description,
  className,
  spacing = 'md',
  align = 'left',
  background = 'default',
  divider = false,
  headerClassName,
  id,
}: SectionContainerProps) {
  const generatedId = useId()
  const titleId = title ? `${id ?? generatedId}-title` : undefined
  const isCentered = align === 'center'
  const dividerVariant: SectionDividerVariant = divider === true ? 'line' : divider || 'line'

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(
        spacingClasses[spacing],
        designSystem.surfaces.section[background],
        className
      )}
    >
      {(title || description) && (
        <div className={cn(designSystem.spacing.page.header, isCentered && 'text-center', headerClassName)}>
          {title && (
            <h2 id={titleId} className={designSystem.typography.display.sectionTitle}>
              {title}
            </h2>
          )}
          {description && (
            <p
              className={cn(
                designSystem.typography.body.base,
                designSystem.typography.muted,
                'mt-2',
                isCentered && 'mx-auto max-w-3xl'
              )}
            >
              {description}
            </p>
          )}
        </div>
      )}
      {children}
      {divider && <SectionDivider variant={dividerVariant} className="mt-8 md:mt-10" />}
    </section>
  )
}
