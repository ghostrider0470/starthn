import { Link, useLocation } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { ChevronDown, Phone } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

function FAQItem({ question, answer, isOpen, onToggle }: {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className={cn(
      'border-b border-border/60 last:border-b-0',
      'transition-colors',
    )}>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 text-left group"
      >
        <span className={cn(
          'text-base font-medium pr-4 transition-colors',
          isOpen ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground'
        )}>
          {question}
        </span>
        <ChevronDown className={cn(
          'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200',
          isOpen && 'rotate-180 text-primary'
        )} />
      </button>
      <div className={cn(
        'overflow-hidden transition-all duration-300',
        isOpen ? 'max-h-96 pb-5' : 'max-h-0'
      )}>
        <p className="text-muted-foreground leading-relaxed text-[0.935rem] pr-8">
          {answer}
        </p>
      </div>
    </div>
  )
}

export function FAQSection() {
  const { t } = useTranslation('landing')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const contactHref = withLocalePath('/contact', currentLocale)
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqKeys = ['services', 'clients', 'process', 'pricing', 'digital', 'deadlines', 'virtualCfo']

  const faqs = faqKeys.map(key => ({
    question: t(`faq.items.${key}.question`),
    answer: t(`faq.items.${key}.answer`),
  }))

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">
          {/* Left: header + CTA */}
          <motion.div
            className="lg:col-span-2 lg:sticky lg:top-28 lg:self-start"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground/80 mb-3 block">
              {t('faq.subtitle')}
            </span>
            <h2 className={cn(
              designSystem.typography.heading.h1,
              'text-3xl md:text-4xl font-bold text-foreground mb-4'
            )}>
              {t('faq.titlePlain')}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              {t('faq.description')}
            </p>

            <div className="space-y-3">
              <Button asChild size="lg" className="landing-cta-primary w-full sm:w-auto">
                <Link to={contactHref}>
                  <Phone className="mr-2 h-4 w-4" />
                  {t('faq.scheduleCall')}
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Right: questions */}
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="rounded-xl border border-border bg-card p-6 md:p-8">
              {faqs.map((faq, i) => (
                <FAQItem
                  key={i}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openIndex === i}
                  onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
