import { motion } from 'motion/react'
import { Link, useLocation } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
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
        'relative min-h-screen flex items-center',
        'bg-starthn-warm',
        'overflow-hidden'
      )}
    >
      {/* Subtle gold radial glow decoration */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 60% 50%, oklch(0.85 0.08 85 / 0.18) 0%, transparent 70%)',
        }}
      />
      {/* Dark mode: deeper gold glow */}
      <div
        className="absolute inset-0 pointer-events-none z-0 hidden dark:block"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 60% 50%, oklch(0.65 0.12 85 / 0.20) 0%, transparent 70%)',
        }}
      />

      <div
        className={cn(
          'relative w-full z-10',
          designSystem.spacing.page.container,
          'max-w-7xl'
        )}
      >
        <div className="py-16 md:py-24">
          {/* Content — centered on mobile, left-aligned on desktop */}
          <div className={cn('text-center lg:text-left', 'max-w-4xl mx-auto lg:mx-0 lg:max-w-[60%]')}>

            {/* Overline label */}
            <motion.p
              className={cn(
                designSystem.typography.display.eyebrow,
                'mb-4 text-primary'
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              Računovodstvena agencija
            </motion.p>

            {/* Main Heading */}
            <motion.h1
              className={cn(
                'mb-6 font-bold leading-tight tracking-tight',
                'text-4xl md:text-5xl lg:text-6xl xl:text-7xl',
                'text-foreground'
              )}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              {t('hero.title')}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className={cn(
                'mb-5 text-xl md:text-2xl leading-relaxed font-semibold',
                'text-foreground/80'
              )}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              {t('hero.subtitle')}
            </motion.p>

            {/* Description */}
            <motion.p
              className={cn(
                'mb-10 text-base md:text-lg leading-relaxed',
                'text-muted-foreground'
              )}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              {t('hero.description')}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className={cn(
                'flex flex-col sm:flex-row',
                designSystem.spacing.gap.md,
                'justify-center items-center lg:justify-start'
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Primary CTA */}
              <Button
                asChild
                size="lg"
                className="landing-cta-primary group"
              >
                <Link to={contactHref}>
                  {t('hero.cta.primary')}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              {/* Secondary CTA */}
              <Button
                asChild
                size="lg"
                variant="outline"
                className="landing-cta-secondary"
              >
                <Link to={servicesHref}>
                  {t('hero.cta.secondary')}
                </Link>
              </Button>
            </motion.div>

            {/* Trust line */}
            <motion.p
              className={cn(
                'mt-8 text-sm tracking-wide',
                'text-muted-foreground/80'
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
            >
              {t('hero.trustLine')}
            </motion.p>

          </div>
        </div>
      </div>
    </section>
  )
}
