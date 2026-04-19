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
    <section className="relative bg-muted/30 py-20 md:py-28">
      <div className={cn(designSystem.spacing.page.container, 'max-w-6xl')}>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* LEFT: copy + features + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t('whyChoose.overline')}
            </p>
            <h2 className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
              {t('whyChoose.title')}
            </h2>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
              {t('whyChoose.description')}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
              {t('whyChoose.body')}
            </p>

            <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              {FEATURES.map(({ key, Icon }) => (
                <li key={key} className="flex items-center gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {t(`whyChoose.features.${key}`)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Button asChild size="lg" className="landing-cta-primary group">
                <Link to={servicesHref}>
                  {t('whyChoose.cta')}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* RIGHT: photo */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-xl shadow-black/5">
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
