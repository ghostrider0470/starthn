import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

const faqKeys = [
  'scope',
  'stack',
  'enterprise',
  'support',
  'integration',
  'industries',
  'engagement',
] as const

export function FAQSection() {
  const { t } = useTranslation('landing')

  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      <div className="container mx-auto px-6 lg:px-8 relative z-30 max-w-3xl">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: designSystem.animation.motion.distance.slideUp }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{
            duration: designSystem.animation.motion.duration.base,
            ease: designSystem.animation.motion.ease.out,
          }}
        >
          <span className="text-sm font-medium uppercase tracking-widest text-primary mb-3 block">
            {t('faq.subtitle')}
          </span>
          <h2
            className={cn(
              designSystem.typography.heading.h1,
              'landing-section-heading text-4xl md:text-5xl font-bold text-foreground'
            )}
          >
            {t('faq.titlePlain')}
          </h2>
          <p
            className={cn(
              designSystem.typography.body.large,
              'landing-section-lead text-muted-foreground'
            )}
          >
            {t('faq.description')}
          </p>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: designSystem.animation.motion.duration.base,
            delay: 0.1,
            ease: designSystem.animation.motion.ease.out,
          }}
        >
          <Accordion type="single" collapsible className="w-full">
            {faqKeys.map((key) => (
              <AccordionItem key={key} value={key}>
                <AccordionTrigger className="text-base font-semibold text-foreground">
                  {t(`faq.items.${key}.question`)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {t(`faq.items.${key}.answer`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}
