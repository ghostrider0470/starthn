import { Link, useLocation } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { ShieldCheck, Briefcase, Award, ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

const CARDS = [
  { key: 'trust', Icon: ShieldCheck },
  { key: 'services', Icon: Briefcase },
  { key: 'expertise', Icon: Award },
] as const

export function ValuePropsSection() {
  const { t } = useTranslation('landing')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)

  return (
    <section className="relative bg-background py-16 md:py-20">
      <div className={cn(designSystem.spacing.page.container, 'max-w-6xl')}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {CARDS.map(({ key, Icon }, i) => {
            const href = withLocalePath(t(`valueProps.${key}.href`), currentLocale)
            return (
              <motion.article
                key={key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-8 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-primary transition-transform duration-500 group-hover:scale-x-100" />
                <div className="mb-6 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-6 w-6" strokeWidth={1.8} />
                </div>
                <h3 className="mb-3 font-heading text-xl font-semibold text-foreground">
                  {t(`valueProps.${key}.title`)}
                </h3>
                <p className="mb-8 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {t(`valueProps.${key}.description`)}
                </p>
                <Link
                  to={href}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  {t(`valueProps.${key}.cta`)}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
