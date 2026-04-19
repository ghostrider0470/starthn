import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { motion, useInView, useMotionValue, useTransform, animate } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

const STAT_KEYS = ['clients', 'experience', 'hours', 'retention'] as const

type StatItem = {
  value: number
  suffix: string
  label: string
  description: string
}

function Counter({ to, suffix, duration = 1.6 }: { to: number; suffix: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString('bs-BA'))
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (!inView) return
    const controls = animate(count, to, { duration, ease: [0.16, 1, 0.3, 1] })
    const unsub = rounded.on('change', (v) => setDisplay(v))
    return () => {
      controls.stop()
      unsub()
    }
  }, [inView, to, duration, count, rounded])

  return (
    <span ref={ref} className="tabular-nums">
      {display}
      <span className="text-primary">{suffix}</span>
    </span>
  )
}

export function StatsSection() {
  const { t } = useTranslation('landing')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const contactHref = withLocalePath('/contact', currentLocale)
  const rawItems = t('stats.items', { returnObjects: true })
  const items: Record<string, StatItem> =
    rawItems && typeof rawItems === 'object' && !Array.isArray(rawItems)
      ? (rawItems as Record<string, StatItem>)
      : ({} as Record<string, StatItem>)

  return (
    <section className="relative bg-background py-20 md:py-28">
      <div className={cn(designSystem.spacing.page.container, 'max-w-6xl')}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14 flex flex-col items-start justify-between gap-6 border-b border-border/60 pb-10 md:flex-row md:items-end"
        >
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t('stats.overline')}
            </p>
            <h2 className="mt-4 font-heading text-2xl font-bold leading-snug tracking-tight text-foreground sm:text-3xl md:text-4xl">
              {t('stats.title')}
            </h2>
          </div>
          <Button asChild size="lg" className="landing-cta-primary group shrink-0">
            <Link to={contactHref}>
              {t('stats.cta')}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {STAT_KEYS.map((key, i) => {
            const stat = items[key]
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="font-heading text-5xl font-bold leading-none tracking-tight text-foreground md:text-6xl">
                  <Counter to={stat.value} suffix={stat.suffix} />
                </div>
                <h3 className="mt-3 text-sm font-semibold uppercase tracking-wide text-foreground/80">
                  {stat.label}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {stat.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
