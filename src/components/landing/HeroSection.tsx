import { motion } from 'motion/react'
import { Link, useLocation } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

const ease = designSystem.animation.motion.ease.out

export function HeroSection() {
  const { t } = useTranslation('landing')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const contactHref = withLocalePath('/contact', currentLocale)
  const servicesHref = withLocalePath('/services', currentLocale)

  return (
    <section className="min-h-[calc(100vh-4rem)] flex items-center bg-background">
      <div className={cn(designSystem.spacing.page.container, 'max-w-4xl py-24 md:py-32')}>
        <div className="flex flex-col items-center text-center">
          {/* Overline */}
          <motion.p
            className="text-xs font-semibold uppercase tracking-[0.2em] text-primary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
          >
            Računovodstvena agencija
          </motion.p>

          {/* Gold decorative line */}
          <motion.div
            className="my-5 h-px w-12 bg-primary/60"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease }}
          />

          {/* Heading */}
          <motion.h1
            className="mb-6 text-5xl font-bold leading-[1.1] tracking-[-0.025em] text-foreground md:text-6xl lg:text-7xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease }}
          >
            {t('hero.title')}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="mb-4 text-lg font-medium tracking-wide text-foreground/70 md:text-xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease }}
          >
            {t('hero.subtitle')}
          </motion.p>

          {/* Description */}
          <motion.p
            className="mb-10 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28, ease }}
          >
            {t('hero.description')}
          </motion.p>

          {/* CTA row */}
          <motion.div
            className="flex flex-col items-center gap-4 sm:flex-row"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.36, ease }}
          >
            <Button asChild size="lg" className="landing-cta-primary group">
              <Link to={contactHref}>
                {t('hero.cta.primary')}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="landing-cta-secondary">
              <Link to={servicesHref}>{t('hero.cta.secondary')}</Link>
            </Button>
          </motion.div>

          {/* Trust line */}
          <motion.p
            className="mt-10 text-sm tracking-wide text-muted-foreground/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.46, ease }}
          >
            {t('hero.trustLine')}
          </motion.p>
        </div>
      </div>
    </section>
  )
}
