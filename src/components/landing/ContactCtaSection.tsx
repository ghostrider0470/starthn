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
  const bullets: string[] = Array.isArray(rawBullets) ? (rawBullets as string[]) : []
  const options: string[] = Array.isArray(rawOptions) ? (rawOptions as string[]) : []
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
    <section className="relative overflow-hidden bg-muted/30 py-20 md:py-28">
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
                <li key={b} className="flex items-start gap-3 text-base text-foreground">
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
            className="relative overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground shadow-xl shadow-primary/20 md:p-10"
          >
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[oklch(0.95_0.06_90)]/40 blur-3xl" />
            <h3 className="mb-6 font-heading text-xl font-semibold">
              {t('contactCta.formTitle')}
            </h3>

            {submitted ? (
              <div className="flex min-h-[20rem] flex-col items-center justify-center text-center">
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary-foreground/20">
                  <Check className="h-7 w-7" strokeWidth={2.5} />
                </div>
                <p className="font-heading text-lg font-medium">{t('contactCta.success')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  name="name"
                  required
                  placeholder={t('contactCta.fields.name')}
                  className="border-white/30 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/60 focus-visible:ring-primary-foreground"
                />
                <Input
                  name="email"
                  type="email"
                  required
                  placeholder={t('contactCta.fields.email')}
                  className="border-white/30 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/60 focus-visible:ring-primary-foreground"
                />
                <select
                  name="service"
                  required
                  defaultValue=""
                  className="flex h-10 w-full rounded-md border border-white/30 bg-primary-foreground/10 px-3 py-2 text-sm text-primary-foreground ring-offset-background placeholder:text-primary-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground"
                >
                  <option value="" disabled className="text-foreground">
                    {t('contactCta.servicePlaceholder')}
                  </option>
                  {options.map((o) => (
                    <option key={o} value={o} className="text-foreground">
                      {o}
                    </option>
                  ))}
                </select>
                <Textarea
                  name="message"
                  rows={4}
                  placeholder={t('contactCta.fields.message')}
                  className="border-white/30 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/60 focus-visible:ring-primary-foreground"
                />
                <Button
                  type="submit"
                  disabled={submitting}
                  size="lg"
                  className="group w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
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
