import { useState } from 'react'
import { motion } from 'motion/react'
import { Check, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

export function ContactCtaSection() {
  const { t } = useTranslation('landing')
  const rawBullets = t('contactCta.bullets', { returnObjects: true })
  const rawOptions = t('contactCta.serviceOptions', { returnObjects: true })
  const bullets: Array<string> = Array.isArray(rawBullets)
    ? (rawBullets as Array<string>)
    : []
  const options: Array<string> = Array.isArray(rawOptions)
    ? (rawOptions as Array<string>)
    : []
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    // Placeholder — future wiring can POST to /api/contact
    await new Promise((r) => setTimeout(r, 600))
    setSubmitted(true)
    setSubmitting(false)
  }

  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-muted/25 py-10 md:py-12">
      <div className={cn(designSystem.spacing.page.container, 'max-w-6xl')}>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[6fr_5fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t('contactCta.overline')}
            </p>
            <h2 className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
              {t('contactCta.title')}
            </h2>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
              {t('contactCta.description')}
            </p>
            <ul className="mt-8 space-y-4">
              {bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-3 text-base text-foreground"
                >
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-8 text-card-foreground shadow-xl shadow-black/5 md:p-10 dark:bg-card/95 dark:shadow-black/30"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
            />
            <h3 className="mb-6 font-heading text-xl font-semibold">
              {t('contactCta.formTitle')}
            </h3>

            {submitted ? (
              <div className="flex min-h-[20rem] flex-col items-center justify-center text-center">
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-7 w-7" strokeWidth={2.5} />
                </div>
                <p className="font-heading text-lg font-medium">
                  {t('contactCta.success')}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  name="name"
                  required
                  placeholder={t('contactCta.fields.name')}
                  className="bg-background/80"
                />
                <Input
                  name="email"
                  type="email"
                  required
                  placeholder={t('contactCta.fields.email')}
                  className="bg-background/80"
                />
                <label htmlFor="contact-service" className="sr-only">
                  {t('contactCta.servicePlaceholder')}
                </label>
                <select
                  id="contact-service"
                  name="service"
                  required
                  defaultValue=""
                  className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="" disabled>
                    {t('contactCta.servicePlaceholder')}
                  </option>
                  {options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <Textarea
                  name="message"
                  rows={4}
                  placeholder={t('contactCta.fields.message')}
                  className="bg-background/80"
                />
                <Button
                  type="submit"
                  disabled={submitting}
                  size="lg"
                  className="landing-cta-primary group w-full"
                >
                  {t('contactCta.submit')}
                  <Send className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
