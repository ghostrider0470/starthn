import { Shield, Monitor, BadgeCheck } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

const differentiators = [
  { key: 'personalized', Icon: Shield },
  { key: 'digital', Icon: Monitor },
  { key: 'licensed', Icon: BadgeCheck },
]

export function WhyUsSection() {
  const { t } = useTranslation('landing')

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Story side */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-medium uppercase tracking-widest text-primary/80 mb-4 block">
              {t('credibility.subtitle')}
            </span>
            <h2 className={cn(
              designSystem.typography.heading.h1,
              'text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-foreground mb-6 leading-tight'
            )}>
              {t('credibility.titlePlain')}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              {t('credibility.description')}
            </p>

            {/* Key points from the story */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <p className="text-muted-foreground">
                  Siguran partner od samog osnivanja firme
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <p className="text-muted-foreground">
                  Ažurno vođenje knjiga i izvještavanje
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <p className="text-muted-foreground">
                  Digitalizacija i virtualni CFO
                </p>
              </div>
            </div>
          </motion.div>

          {/* Differentiator cards */}
          <div className="space-y-5">
            {differentiators.map((diff, i) => {
              const Icon = diff.Icon
              return (
                <motion.div
                  key={diff.key}
                  className={cn(
                    'rounded-xl border border-border bg-card p-6',
                    'transition-all duration-300',
                    'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
                  )}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                >
                  <div className="flex items-start gap-5">
                    <div className="shrink-0 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1.5">
                        {t(`credibility.differentiators.${diff.key}.title`)}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed text-[0.935rem]">
                        {t(`credibility.differentiators.${diff.key}.description`)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
