import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SlideUp, observeFirstReveal } from '@/components/animations/FadeIn'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/components/ContactActions'
import {
  GOOGLE_RATING,
  GOOGLE_REVIEW_COUNT,
  formatRating,
} from '@/lib/business'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

const STAT_KEYS = ['clients', 'experience', 'hours', 'retention'] as const

/**
 * A stat whose suffix is a star is the Google rating (landing stats.items.hours
 * in the locales that replaced "1.000+ sati" with it). Its number comes from
 * the business constants, with one decimal ("5,0"), and never counts up.
 */
const RATING_SUFFIX = '★'

function isRatingStat(stat: StatItem): boolean {
  return typeof stat.suffix === 'string' && stat.suffix.trim() === RATING_SUFFIX
}

type StatItem = {
  value: number
  suffix: string
  label: string
  /** Absent on the rating stat, whose text is plural (description_one, …). */
  description?: string
}

function formatStatValue(value: number) {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** Close to the site's cubic-bezier(0.16, 1, 0.3, 1) ease-out. */
function easeOutExpo(progress: number) {
  return progress >= 1 ? 1 : 1 - Math.pow(2, -10 * progress)
}

/**
 * Stat number. The server HTML and first paint show the final value; the
 * count-up from zero only runs for a number that is still below the viewport
 * after hydration, when it scrolls into view (never under reduced motion).
 */
function Counter({
  to,
  suffix,
  duration = 1.6,
}: {
  to: number
  suffix: string
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  // Value shown while counting up; null means the final value.
  const [counting, setCounting] = useState<string | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined

    let frame = 0
    const stopObserving = observeFirstReveal(
      el,
      () => {
        const start = performance.now()
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / (duration * 1000))
          setCounting(
            progress < 1 ? formatStatValue(to * easeOutExpo(progress)) : null,
          )
          if (progress < 1) frame = requestAnimationFrame(tick)
        }
        setCounting(formatStatValue(0))
        frame = requestAnimationFrame(tick)
      },
      { margin: '0px 0px -80px 0px' },
    )
    if (!stopObserving) return undefined

    return () => {
      stopObserving()
      cancelAnimationFrame(frame)
      // An interrupted count-up must not leave a partial number behind.
      setCounting(null)
    }
  }, [to, duration])

  return (
    <span ref={ref} className="tabular-nums">
      {counting ?? formatStatValue(to)}
      <span className="text-primary">{suffix}</span>
    </span>
  )
}

export function StatsSection() {
  const { t } = useTranslation('landing')
  const locale = useLocale()
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const contactHref = withLocalePath('/contact', currentLocale)
  const rawItems = t('stats.items', { returnObjects: true })
  const items: Record<string, StatItem> =
    rawItems && typeof rawItems === 'object' && !Array.isArray(rawItems)
      ? (rawItems as Record<string, StatItem>)
      : ({} as Record<string, StatItem>)

  return (
    <section className="relative bg-background py-12 md:py-14">
      <div className={cn(designSystem.spacing.page.container, 'max-w-6xl')}>
        <SlideUp
          offset={24}
          duration={0.6}
          className="mb-9 flex flex-col items-start justify-between gap-5 border-b border-border/60 pb-7 md:flex-row md:items-end"
        >
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t('stats.overline')}
            </p>
            <h2 className="mt-3 font-heading text-2xl font-bold leading-snug tracking-tight text-foreground sm:text-3xl md:text-4xl">
              {t('stats.title')}
            </h2>
          </div>
          <Button
            asChild
            size="lg"
            className="landing-cta-primary group shrink-0"
          >
            <Link to={contactHref}>
              {t('stats.cta')}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </SlideUp>

        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {STAT_KEYS.map((key, i) => {
            const stat = items[key]
            if (!stat) return null
            return (
              <SlideUp key={key} offset={20} duration={0.5} delay={i * 0.08}>
                <div className="font-heading text-4xl font-bold leading-none tracking-tight text-foreground md:text-5xl">
                  {isRatingStat(stat) ? (
                    <span className="tabular-nums">
                      {formatRating(GOOGLE_RATING, locale)}
                      <span aria-hidden className="ml-1 text-primary">
                        {RATING_SUFFIX}
                      </span>
                    </span>
                  ) : (
                    <Counter to={stat.value} suffix={stat.suffix} />
                  )}
                </div>
                <h3 className="mt-3 text-sm font-semibold uppercase tracking-wide text-foreground/80">
                  {stat.label}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {isRatingStat(stat)
                    ? // The review count comes from the business constants
                      // (never a number typed into 16 locale files), with the
                      // locale's plural form (description_one, _few, …).
                      t(`stats.items.${key}.description`, {
                        count: GOOGLE_REVIEW_COUNT,
                        defaultValue: '',
                      })
                    : stat.description}
                </p>
              </SlideUp>
            )
          })}
        </div>
      </div>
    </section>
  )
}
