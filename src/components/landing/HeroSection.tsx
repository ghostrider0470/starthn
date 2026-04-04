import { Link, useLocation } from '@tanstack/react-router'
import { ArrowRight, Phone } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

export function HeroSection() {
  const { t } = useTranslation('landing')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const contactHref = withLocalePath('/contact', currentLocale)
  const servicesHref = withLocalePath('/services', currentLocale)

  return (
    <section
      className={cn(
        'relative min-h-[85vh] flex items-center',
        'bg-gradient-to-b from-primary/5 via-background to-background',
        'overflow-hidden'
      )}
    >
      {/* Subtle background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,107,53,0.08),transparent_50%)] pointer-events-none" />

      <div
        className={cn(
          'relative w-full z-20',
          designSystem.spacing.page.container,
          'max-w-7xl'
        )}
      >
        <div className="py-12 md:py-20">
          <div className={cn('text-center', 'max-w-4xl mx-auto')}>
            {/* Main Heading */}
            <motion.h1
              className={cn(
                designSystem.typography.heading.h1,
                'mb-8 text-4xl sm:text-5xl md:text-6xl lg:text-7xl',
                'font-bold leading-tight tracking-tight text-foreground',
              )}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {t('hero.title')}
            </motion.h1>

            {/* Subheading */}
            <motion.p
              className={cn(
                'mb-6 text-xl md:text-2xl leading-relaxed font-semibold',
                'text-primary/80'
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {t('hero.subtitle')}
            </motion.p>

            {/* Description */}
            <motion.p
              className={cn(
                'mb-12 text-base md:text-lg leading-relaxed',
                'text-muted-foreground max-w-2xl mx-auto'
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              {t('hero.description')}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className={cn(
                'flex flex-col sm:flex-row',
                designSystem.spacing.gap.md,
                'justify-center items-center'
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <Button asChild size="lg" className="landing-cta-primary group">
                <Link to={contactHref}>
                  <Phone className="mr-2 h-4 w-4" />
                  {t('hero.cta.primary')}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              <Button asChild size="lg" variant="outline" className="landing-cta-secondary">
                <Link to={servicesHref}>
                  {t('hero.cta.secondary')}
                </Link>
              </Button>
            </motion.div>

            {/* Trust line */}
            <motion.p
              className={cn(
                'mt-8 text-sm tracking-wide text-muted-foreground/80'
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              {t('hero.trustLine')}
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  )
}
