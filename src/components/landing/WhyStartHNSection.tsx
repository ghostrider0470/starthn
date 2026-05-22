import { Link, useLocation } from '@tanstack/react-router'
import { motion } from 'motion/react'
import {
  UserCheck,
  LineChart,
  Layers,
  Cloud,
  GraduationCap,
  BadgeCheck,
  ArrowRight,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

const FEATURES = [
  { key: 'personal', Icon: UserCheck },
  { key: 'vcfo', Icon: LineChart },
  { key: 'tailored', Icon: Layers },
  { key: 'online', Icon: Cloud },
  { key: 'education', Icon: GraduationCap },
  { key: 'loyalty', Icon: BadgeCheck },
] as const

export function WhyStartHNSection() {
  const { t } = useTranslation('landing')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const servicesHref = withLocalePath('/services', currentLocale)

  return (
    <section className="relative bg-muted/30 py-12 md:py-14">
      <div className={cn(designSystem.spacing.page.container, 'max-w-7xl')}>
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-10">
          {/* Copy stays first on mobile; desktop mirrors the live site with image left. */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="min-w-0 lg:order-2 lg:col-span-7"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t('whyChoose.overline')}
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold leading-[1.06] tracking-tight text-foreground sm:text-4xl 2xl:text-5xl">
              {t('whyChoose.title')}
            </h2>
            <p className="mt-5 text-[0.96rem] leading-7 text-muted-foreground">
              {t('whyChoose.description')}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t('whyChoose.body')}
            </p>

            <ul className="mt-7 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {FEATURES.map(({ key, Icon }) => (
                <li key={key} className="flex items-center gap-3">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {t(`whyChoose.features.${key}`)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-7">
              <Button asChild size="lg" className="landing-cta-primary group">
                <Link to={servicesHref}>
                  {t('whyChoose.cta')}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative min-w-0 lg:order-1 lg:col-span-5"
          >
            <div className="relative aspect-[4/5] max-h-[min(52svh,500px)] min-h-[360px] overflow-hidden rounded-2xl shadow-xl shadow-black/5 lg:mr-auto lg:w-full">
              <img
                src="/why-start-hn.webp"
                alt={t('whyChoose.title', { defaultValue: '' })}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                width={1200}
                height={1500}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
