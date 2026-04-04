import { Suspense, lazy, useState, useCallback } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import { featureFlags } from '@/lib/feature-flags'
import DecryptedText from '@/components/DecryptedText'
import { HeroCRTReveal, CRTScrollIndicator } from './HeroCRTReveal'

const ParticleBackground = lazy(() =>
  import('@/components/ui/ParticleBackground').then((module) => ({
    default: module.ParticleBackground,
  })),
)

function ParticleBackgroundFallback() {
  return (
    <div className="h-full w-full animate-pulse bg-[radial-gradient(circle_at_20%_20%,rgba(255,107,53,0.18),transparent_38%),radial-gradient(circle_at_75%_30%,rgba(168,85,247,0.16),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(255,107,53,0.12),transparent_45%)]" />
  )
}

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

      {/* Particle Background — dark mode only */}
      <div className="absolute inset-0 z-0 opacity-60 hidden dark:block">
        <Suspense fallback={<ParticleBackgroundFallback />}>
          <ParticleBackground />
        </Suspense>
      </div>

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
                <DecryptedText
                  text={t('hero.title')}
                  speed={30}
                  sequential={true}
                  revealDirection="start"
                  animateOn="view"
                  className={cn(
                    // Light: pure black, confident
                    'text-foreground',
                    // Dark: clean foreground text to match other section headings
                    'dark:text-foreground'
                  )}
                  encryptedClassName="text-primary/60"
                />
              </h1>

              {/* Subheading */}
              <motion.p
                className={cn(
                  'mb-6 text-xl md:text-2xl leading-relaxed font-semibold',
                  'text-foreground/85 dark:text-foreground/85'
                )}
                initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
                animate={{ opacity: 1, clipPath: 'inset(0 0 0 0)' }}
                transition={{ delay: 0.3, duration: 0.5 }}
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
              >
                {t('hero.trustLine')}
              </motion.p>

              {/* Scroll Indicator */}
              <motion.div
                className="mt-10 flex justify-center lg:justify-start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0, duration: 0.5 }}
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
