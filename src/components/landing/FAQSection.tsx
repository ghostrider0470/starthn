import { Link, useLocation } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import { TerminalAccordion } from './TerminalAccordion'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { useCRTEffect } from '@/hooks/useCRTEffect'
import { FileText, MessageSquare } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { featureFlags } from '@/lib/feature-flags'

export function FAQSection() {
  const { t } = useTranslation('landing')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const contactHref = withLocalePath('/contact', currentLocale)
  const caseStudiesHref = withLocalePath('/case-studies', currentLocale)

  const faqs = [
    {
      question: t('faq.items.scope.question'),
      answer: t('faq.items.scope.answer'),
    },
    {
      question: t('faq.items.stack.question'),
      answer: t('faq.items.stack.answer'),
    },
    {
      question: t('faq.items.enterprise.question'),
      answer: t('faq.items.enterprise.answer'),
    },
    {
      question: t('faq.items.support.question'),
      answer: t('faq.items.support.answer'),
    },
    {
      question: t('faq.items.integration.question'),
      answer: t('faq.items.integration.answer'),
    },
    {
      question: t('faq.items.industries.question'),
      answer: t('faq.items.industries.answer'),
    },
    {
      question: t('faq.items.engagement.question'),
      answer: t('faq.items.engagement.answer'),
    },
  ]

  // Section reveal and CRT effect
  const { ref: sectionRef, isInView } = useScrollReveal({
    threshold: 0.2,
    rootMargin: '-100px',
  })

  useCRTEffect({
    sectionId: 'faq',
    intensity: 'subtle',
    isInView,
  })

  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      {/* Subtle scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02] hidden dark:block"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />

      <div
        ref={sectionRef as React.RefObject<HTMLDivElement>}
        className="container mx-auto px-6 lg:px-8 relative z-30 max-w-7xl"
      >
        {/* Content - centered, full width */}
        <div className="max-w-3xl mx-auto">
          {/* Header - centered */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Light subtitle */}
            <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground/80 mb-3 block dark:hidden">
              {t('faq.subtitle')}
            </span>

            <h2
              className={cn(
                designSystem.typography.heading.h1,
                'landing-section-heading text-4xl md:text-5xl font-bold'
              )}
            >
              {/* Dark monospace marker */}
              <span className="font-mono text-primary/70 text-2xl mb-2 hidden dark:block">
                {t('faq.commentMarker')}
              </span>
              <Trans
                t={t}
                i18nKey="faq.title"
                components={{
                  gradient: (
                    <span className="text-foreground dark:bg-gradient-to-r dark:from-primary dark:to-accent dark:bg-clip-text dark:text-transparent" />
                  ),
                }}
              />
            </h2>
            <p
              className={cn(
                designSystem.typography.body.large,
                'landing-section-lead text-muted-foreground dark:text-muted-foreground'
              )}
            >
              {t('faq.description')}
            </p>
          </motion.div>

          {/* Terminal Accordion */}
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <TerminalAccordion
              items={faqs}
              typingSpeed={3}
              enableTypingAnimation={true}
            />
          </motion.div>

          {/* Still have questions CTA */}
          <motion.div
            className={cn(
              'relative rounded-2xl p-8 text-center md:text-left overflow-hidden',
              'bg-gradient-to-br from-primary/5 via-background to-accent/5',
              'border border-primary/20'
            )}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Terminal dots (dark only) */}
            <div className="absolute top-4 left-4 gap-1.5 opacity-40 hidden dark:flex">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <div className="w-3 h-3 rounded-full bg-accent" />
              <div className="w-3 h-3 rounded-full bg-primary" />
            </div>

            <div className="relative z-10 mt-4">
              <h3
                className={cn(
                  designSystem.typography.heading.h3,
                  'mb-4 text-xl font-bold'
                )}
              >
                {t('faq.stillHaveQuestions')}
              </h3>
              <p
                className={cn(
                  designSystem.typography.body.base,
                  'text-muted-foreground dark:text-muted-foreground',
                  'mb-6'
                )}
              >
                {t('faq.ctaDescription')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                {featureFlags.caseStudies && (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="landing-cta-secondary group"
                >
                  <Link to={caseStudiesHref}>
                    <FileText className="mr-2 h-4 w-4 group-hover:text-primary transition-colors" />
                    {t('faq.readCaseStudies')}
                  </Link>
                </Button>
                )}
                <Button
                  asChild
                  size="lg"
                  className="landing-cta-primary"
                >
                  <Link to={contactHref}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {t('faq.scheduleCall')}
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
