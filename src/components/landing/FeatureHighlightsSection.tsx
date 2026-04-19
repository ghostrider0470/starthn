import { motion } from 'motion/react'
import { Database, TrendingUp, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

const FEATURES = [
  { key: 'digital', Icon: Database },
  { key: 'grow', Icon: TrendingUp },
  { key: 'licensed', Icon: ShieldCheck },
] as const

export function FeatureHighlightsSection() {
  const { t } = useTranslation('landing')

  return (
    <section className="relative bg-muted/30 py-20 md:py-24">
      <div className={cn(designSystem.spacing.page.container, 'max-w-6xl')}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 max-w-2xl"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {t('features.overline')}
          </p>
          <h2 className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            {t('features.title')}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {FEATURES.map(({ key, Icon }, i) => (
            <motion.article
              key={key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.55, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] }}
              className="group relative flex items-start gap-5 rounded-xl border-l-2 border-transparent p-4 transition-colors hover:border-primary hover:bg-background"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-foreground text-background transition-transform group-hover:scale-110">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  {t(`features.items.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`features.items.${key}.description`)}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
