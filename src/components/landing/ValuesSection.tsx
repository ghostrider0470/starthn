import { motion } from 'motion/react'
import {
  ShieldCheck,
  BadgeCheck,
  HeartHandshake,
  Trophy,
  Eye,
  Flame,
  Check,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

const VALUE_KEYS = [
  { key: 'integrity', Icon: ShieldCheck },
  { key: 'accountability', Icon: BadgeCheck },
  { key: 'accessibility', Icon: HeartHandshake },
  { key: 'excellence', Icon: Trophy },
  { key: 'transparency', Icon: Eye },
  { key: 'dedication', Icon: Flame },
] as const

export function ValuesSection() {
  const { t } = useTranslation('landing')
  const rawBullets = t('values.bullets', { returnObjects: true })
  const bullets: string[] = Array.isArray(rawBullets) ? (rawBullets as string[]) : []

  return (
    <section className="relative overflow-hidden bg-background py-20 md:py-28">
      <div className={cn(designSystem.spacing.page.container, 'max-w-6xl')}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {t('values.overline')}
          </p>
          <h2 className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {t('values.title')}
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
            {t('values.description')}
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
          }}
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-5"
        >
          {VALUE_KEYS.map(({ key, Icon }) => (
            <motion.article
              key={key}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
              <div className="relative flex items-start gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-semibold text-foreground">
                    {t(`values.items.${key}.name`)}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {t(`values.items.${key}.description`)}
                  </p>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>

        {bullets.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-14 flex max-w-4xl flex-col gap-4 border-t border-border/60 pt-10 sm:flex-row sm:justify-center sm:gap-8"
          >
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm text-foreground/80">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="leading-snug">{b}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </div>
    </section>
  )
}
