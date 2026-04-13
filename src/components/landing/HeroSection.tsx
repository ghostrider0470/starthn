import { useState, useCallback } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import { featureFlags } from '@/lib/feature-flags'
import { HeroCRTReveal, CRTScrollIndicator } from './HeroCRTReveal'

export function HeroSection() {
  const [bootComplete, setBootComplete] = useState(false)
  const { t } = useTranslation('landing')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const contactHref = withLocalePath('/contact', currentLocale)
  const caseStudiesHref = withLocalePath('/case-studies', currentLocale)

  const handleBootComplete = useCallback(() => {
    setBootComplete(true)
  }, [])

  return (
    <section
      className={cn(
        'relative min-h-screen flex items-center',
        // Light: matches Track Record section tint for globe visibility
        'bg-muted/30',
        // Dark: existing CRT aesthetic
        'dark:bg-gradient-to-b dark:from-background dark:via-primary/5 dark:to-background',
        'overflow-hidden'
      )}
    >
      {/* Grid background pattern — dark mode only */}
      <div className="absolute inset-0 bg-grid-slate-200/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] z-0 hidden dark:block" />

      {/* Animated phosphor glow background — dark mode only, CSS animation to avoid JS overhead */}
      <div
        className="absolute inset-0 pointer-events-none z-0 hidden dark:block animate-phosphor-glow"
      />

      <div
        className={cn(
          'relative w-full z-20',
          designSystem.spacing.page.container,
          'max-w-7xl'
        )}
      >
        <HeroCRTReveal onBootComplete={handleBootComplete}>
          <div className="py-12 md:py-20">
            {/* Content - centered on mobile, left-aligned on desktop */}
            <div className={cn('text-center lg:text-left', 'max-w-4xl mx-auto lg:mx-0 lg:max-w-[55%]')}>
              {/* Main Heading */}
              <h1
                className={cn(
                  designSystem.typography.heading.h1,
                  'mb-8 text-5xl md:text-6xl lg:text-7xl',
                  'font-bold leading-tight tracking-tight',
                  'dark:drop-shadow-lg'
                )}
              >
                <span className="text-foreground">{t('hero.title')}</span>
              </h1>

              {/* Subheading */}
              <motion.p
                className={cn(
                  'mb-6 text-xl md:text-2xl leading-relaxed font-semibold',
                  'text-foreground/85 dark:text-foreground/85'
                )}
                initial={false}
                animate={{ opacity: 1, clipPath: 'inset(0 0 0 0)' }}
              >
                {t('hero.subtitle')}
              </motion.p>

              {/* Description */}
              <motion.p
                className={cn(
                  'mb-12 text-base md:text-lg leading-relaxed',
                  'text-muted-foreground dark:text-muted-foreground',
                  'dark:drop-shadow'
                )}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
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
                initial={false}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Primary CTA */}
                <Button
                  asChild
                  size="lg"
                  className={cn(
                    'landing-cta-primary group relative overflow-hidden'
                  )}
                >
                  <Link to={contactHref}>
                    {/* RGB split effect on hover — dark only */}
                    <span className="relative z-10 dark:group-hover:animate-rgb-split-hover">
                      {t('hero.cta.primary')}
                    </span>
                    <ArrowRight className="ml-2 h-4 w-4 relative z-10 transition-transform group-hover:translate-x-1" />
                    {/* Scan line effect — dark mode only */}
                    <span
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden dark:block"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
                      }}
                    />
                  </Link>
                </Button>

                {/* Secondary CTA — hidden when case studies are disabled */}
                {featureFlags.caseStudies && (
                <Button
                  asChild
                  size="lg"
                  className={cn(
                    'landing-cta-secondary group relative overflow-hidden'
                  )}
                >
                  <Link to={caseStudiesHref}>
                    <span className="relative z-10">{t('hero.cta.secondary')}</span>
                    {/* Chromatic aberration — dark mode only */}
                    <span
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden dark:block"
                      style={{
                        boxShadow:
                          'inset -2px 0 0 rgba(255,0,0,0.3), inset 2px 0 0 rgba(0,255,255,0.3)',
                      }}
                    />
                  </Link>
                </Button>
                )}
              </motion.div>

              {/* Trust line */}
              <motion.p
                className={cn(
                  'mt-8 text-sm tracking-wide',
                  // Light: readable over globe
                  'text-muted-foreground/80',
                  // Dark: monospace terminal feel
                  'dark:text-muted-foreground dark:font-mono'
                )}
                initial={false}
                animate={{ opacity: 1 }}
              >
                {t('hero.trustLine')}
              </motion.p>

              {/* Scroll Indicator */}
              <motion.div
                className="mt-10 flex justify-center lg:justify-start"
                initial={false}
                animate={{ opacity: 1 }}
              >
                <CRTScrollIndicator />
              </motion.div>
            </div>
          </div>
        </HeroCRTReveal>
      </div>
    </section>
  )
}
