import React from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'
import { Button } from '@/components/ui/button'
import { PageContainer } from './PageContainer'
import { AzureIcon } from '@/components/ui/azure-icon'
import { TechBadge } from '@/components/ui/tech-badge'

interface Breadcrumb {
  label: string
  href?: string
}

interface Tag {
  label: string
  color?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  kicker?: string
  breadcrumbs?: Breadcrumb[]
  showBackButton?: boolean
  backButtonLabel?: string
  backButtonHref?: string
  actions?: React.ReactNode
  className?: string
  icon?: LucideIcon
  icons?: Array<LucideIcon | string>
  iconColor?: string
  tags?: Tag[]
  variant?: 'default' | 'hero' | 'service' | 'resource' | 'innovation'
  align?: 'left' | 'center'
  heroSize?: 'default' | 'large'
  actionButtons?: React.ReactNode
}

const heroShellClasses = {
  hero: cn(designSystem.surfaces.section.gradient, 'relative py-12 lg:py-16'),
  service: cn(designSystem.surfaces.cta.default, 'relative py-12 lg:py-16'),
  resource: cn(designSystem.surfaces.cta.cool, 'relative py-10 lg:py-14'),
  innovation: cn(designSystem.surfaces.cta.mesh, 'relative py-12 lg:py-20'),
}

export function PageHeader({
  title,
  description,
  kicker,
  breadcrumbs = [],
  showBackButton = false,
  backButtonLabel = 'Back',
  backButtonHref,
  actions,
  className,
  icon,
  icons,
  iconColor = 'var(--primary)',
  tags = [],
  variant = 'default',
  align = 'left',
  heroSize = 'default',
  actionButtons,
}: PageHeaderProps) {
  const displayIcons = icons || (icon ? [icon] : [])
  const isCentered = align === 'center'
  const isHeroVariant = variant !== 'default'
  const titleClassName = isHeroVariant
    ? heroSize === 'large'
      ? designSystem.typography.display.hero
      : designSystem.typography.display.heroCompact
    : designSystem.typography.heading.h1

  const renderIcon = (iconItem: LucideIcon | string, index: number) => {
    const isAzureIcon = typeof iconItem === 'string'
    const wrapperClassName = isCentered
      ? cn(designSystem.icons.wrapper.lg, 'sm:h-20 sm:w-20 sm:p-4')
      : cn(designSystem.icons.wrapper.md, 'sm:h-16 sm:w-16 sm:rounded-2xl sm:p-3')

    return (
      <div
        key={`${isAzureIcon ? iconItem : iconItem.displayName || 'icon'}-${index}`}
        className={cn(
          'inline-flex items-center justify-center',
          wrapperClassName,
          isCentered ? 'bg-primary/10' : 'flex-shrink-0',
          !isCentered && !isAzureIcon && 'bg-primary/10'
        )}
      >
        {isAzureIcon ? (
          <AzureIcon iconPath={iconItem} />
        ) : (
          React.createElement(iconItem as LucideIcon, {
            className: isCentered
              ? cn(designSystem.icons.size.hero, 'text-primary')
              : designSystem.icons.size.xl,
            style: !isCentered ? { color: iconColor } : undefined,
          })
        )}
      </div>
    )
  }

  const content = (
    <div
      className={cn(
        variant === 'default' && designSystem.spacing.page.header,
        isCentered && 'text-center',
        className
      )}
    >
      {showBackButton && backButtonHref && !isCentered && (
        <Link to={backButtonHref}>
          <Button variant="ghost" className={cn('mb-6 min-h-11', designSystem.effects.focusRing)}>
            <ArrowLeft className={cn('mr-2', designSystem.icons.size.sm)} />
            {backButtonLabel}
          </Button>
        </Link>
      )}

      {breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className={cn(
            'mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-sm text-muted-foreground',
            isCentered && 'justify-center'
          )}
        >
          {breadcrumbs.map((breadcrumb, index) => (
            <React.Fragment key={`${breadcrumb.label}-${index}`}>
              {breadcrumb.href ? (
                <Link
                  to={breadcrumb.href}
                  className={cn(
                    'rounded-sm transition-colors hover:text-foreground',
                    designSystem.effects.focusRing
                  )}
                >
                  {breadcrumb.label}
                </Link>
              ) : (
                <span className="text-foreground">{breadcrumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 && (
                <ChevronRight className={designSystem.icons.size.sm} aria-hidden />
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {displayIcons.length > 0 && isCentered && (
        <div className="mb-8 flex flex-wrap justify-center gap-3 sm:gap-4">
          {displayIcons.map((iconItem, index) => renderIcon(iconItem, index))}
        </div>
      )}

      <div
        className={cn(
          'flex flex-col gap-4 sm:gap-6',
          !isCentered && 'mb-6 sm:flex-row sm:items-start'
        )}
      >
        {displayIcons.length > 0 && !isCentered &&
          displayIcons.map((iconItem, index) => renderIcon(iconItem, index))}
        <div className={cn('min-w-0 flex-1', isCentered && 'mx-auto')}>
          {kicker && <p className={cn('mb-3', designSystem.typography.display.eyebrow)}>{kicker}</p>}
          <h1 className={cn(titleClassName, 'break-words', isCentered ? 'mb-6' : 'mb-2')}>
            {title}
          </h1>
          {tags.length > 0 && (
            <div className={cn('mb-4 flex flex-wrap gap-2', isCentered && 'justify-center')}>
              {tags.map((tag, index) => (
                <TechBadge
                  key={`${tag.label}-${index}`}
                  label={tag.label}
                  tone={tag.color ? 'custom' : 'subtle'}
                  color={tag.color ?? iconColor}
                />
              ))}
            </div>
          )}
          {description && (
            <p
              className={cn(
                designSystem.typography.body.lead,
                designSystem.typography.muted,
                'break-words',
                isCentered && 'mx-auto mb-8 max-w-3xl',
                !isCentered && 'max-w-3xl'
              )}
            >
              {description}
            </p>
          )}
          {actionButtons && (
            <div className={cn('flex flex-wrap gap-4', isCentered && 'justify-center')}>
              {actionButtons}
            </div>
          )}
        </div>
        {actions && !isCentered && (
          <div className="flex items-center gap-2 sm:ml-auto">{actions}</div>
        )}
      </div>
    </div>
  )

  if (variant === 'default') {
    return content
  }

  return (
    <section className={heroShellClasses[variant]}>
      <PageContainer spacing="none">
        <div className="mx-auto max-w-5xl">{content}</div>
      </PageContainer>
    </section>
  )
}
