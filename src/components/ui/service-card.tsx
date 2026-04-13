import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { ComponentType } from 'react'
import { AzureIcon } from '@/components/ui/azure-icon'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

interface ServiceCardProps {
  icon?: ComponentType<{ className?: string }>
  iconPath?: string | Array<string>
  title: string
  description: string
  color: string
  bgColor: string
  hoverGradient: string
  href?: string
  onLearnMore?: () => void
}

export function ServiceCard({
  icon: Icon,
  iconPath,
  title,
  description,
  color,
  bgColor,
  hoverGradient,
  href,
  onLearnMore,
}: ServiceCardProps) {
  const { t } = useTranslation('landing')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const localizedHref = href ? withLocalePath(href, currentLocale) : undefined
  const iconPaths = Array.isArray(iconPath)
    ? iconPath
    : iconPath
      ? [iconPath]
      : []
  const hasMultipleIcons = iconPaths.length > 1
  const [currentIconIndex, setCurrentIconIndex] = useState(0)

  // Icon rotation effect
  useEffect(() => {
    if (!hasMultipleIcons) return

    const interval = setInterval(() => {
      setCurrentIconIndex((prev) => (prev + 1) % iconPaths.length)
    }, 2000)

    return () => clearInterval(interval)
  }, [hasMultipleIcons, iconPaths.length])

  return (
    <div
      className={cn(
        'group relative h-full p-6 md:p-8 transition-all duration-500 ease-out cursor-pointer',
        // Light mode: Apple-clean with refined shadows
        'bg-card border border-border rounded-2xl',
        'shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
        'hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:border-primary/30 hover:-translate-y-1',
        // Dark mode: CRT card
        'dark:bg-card dark:border-border/50 dark:rounded-3xl dark:shadow-none',
        'dark:hover:shadow-2xl dark:hover:shadow-primary/20 dark:hover:border-primary/50 dark:hover:-translate-y-2',
      )}
      onClick={onLearnMore}
    >
      {/* Animated gradient background (dark only) */}
      <div
        className={cn(
          'absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500',
          'bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5',
          'group-hover:opacity-100',
          'hidden dark:block',
        )}
      />

      {/* Scanline overlay on hover (dark only) */}
      <div
        className={cn(
          'absolute inset-0 rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300',
          'hidden dark:block',
        )}
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(255,107,53,0.03) 2px, rgba(255,107,53,0.03) 4px)',
        }}
      />

      {/* Content — horizontal layout: icon left, text right */}
      <div className="relative z-10 flex h-full gap-5">
        {/* Icon column */}
        <div className="flex shrink-0 flex-col items-center gap-2">
          <div
            className={cn(
              'inline-flex h-14 w-14 md:h-[4.5rem] md:w-[4.5rem] items-center justify-center rounded-2xl relative overflow-hidden',
              'transition-all duration-300 group-hover:scale-105',
              bgColor,
            )}
          >
            {iconPaths.length > 0 ? (
              iconPaths.map((path, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'absolute inset-0 flex items-center justify-center p-2.5 md:p-3',
                    'transition-all duration-500 ease-in-out',
                    idx === currentIconIndex
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 scale-75',
                  )}
                >
                  <AzureIcon
                    iconPath={path}
                    className={cn('transition-all duration-300', color)}
                  />
                </div>
              ))
            ) : Icon ? (
              <Icon
                className={cn(
                  'h-8 w-8 md:h-9 md:w-9 transition-all duration-300',
                  color,
                )}
              />
            ) : null}
          </div>

          {/* Icon indicator dots */}
          {hasMultipleIcons && (
            <div className="flex gap-1.5">
              {iconPaths.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'h-1.5 w-1.5 rounded-full transition-all duration-300',
                    idx === currentIconIndex
                      ? 'bg-foreground dark:bg-primary w-4'
                      : 'bg-muted-foreground/30',
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Text content column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Title with theme-aware hover */}
          <h3
            className={cn(
              designSystem.typography.heading.h3,
              'mb-3 text-xl font-bold leading-tight transition-colors duration-300',
              // Light: stays dark gray on hover
              'text-foreground group-hover:text-foreground/85',
              // Dark: shifts to primary + RGB split
              'dark:text-foreground dark:group-hover:text-primary dark:group-hover:animate-rgb-split-hover',
            )}
          >
            {title}
          </h3>

          {/* Description — flex-1 pushes CTA to bottom for equal card heights */}
          <p
            className={cn(
              designSystem.typography.body.base,
              'text-muted-foreground dark:text-muted-foreground',
              'mb-5 flex-1 leading-relaxed text-base',
            )}
          >
            {description}
          </p>

          {/* CTA — Light: inline text link */}
          {localizedHref ? (
            <>
              <Link
                to={localizedHref}
                className={cn(
                  'inline-flex items-center gap-1.5 text-sm font-medium relative z-10',
                  'text-muted-foreground hover:text-foreground transition-colors duration-300',
                  'hover:underline underline-offset-4',
                  'flex dark:hidden',
                )}
              >
                {t('services.learnMore')}<span className="sr-only"> — {title}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              {/* CTA — Dark: full-width bordered button */}
              <Link
                to={localizedHref}
                className={cn(
                  'w-full items-center justify-between rounded-xl px-4 py-2 text-sm',
                  'relative z-10 transition-all duration-300',
                  'border border-border/30',
                  'group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary',
                  'hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg',
                  'hidden dark:flex',
                )}
              >
                <span className="font-medium">{t('services.learnMore')}<span className="sr-only"> — {title}</span></span>
                <ArrowRight className="h-4 w-4 transition-all duration-300 group-hover:translate-x-2 group-hover:scale-110" />
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={onLearnMore}
                className={cn(
                  'inline-flex items-center gap-1.5 text-sm font-medium relative z-10',
                  'text-muted-foreground hover:text-foreground transition-colors duration-300',
                  'hover:underline underline-offset-4',
                  'flex dark:hidden',
                )}
              >
                {t('services.learnMore')}<span className="sr-only"> — {title}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <button
                onClick={onLearnMore}
                className={cn(
                  'w-full items-center justify-between rounded-xl px-4 py-2 text-sm',
                  'relative z-10 transition-all duration-300',
                  'border border-border/30',
                  'group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary',
                  'hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg',
                  'hidden dark:flex',
                )}
              >
                <span className="font-medium">{t('services.learnMore')}<span className="sr-only"> — {title}</span></span>
                <ArrowRight className="h-4 w-4 transition-all duration-300 group-hover:translate-x-2 group-hover:scale-110" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Subtle pattern overlay (dark only) */}
      <div
        className={cn(
          'absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500',
          'bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_50%)]',
          'group-hover:opacity-100 pointer-events-none',
          'hidden dark:block',
        )}
      />
    </div>
  )
}
