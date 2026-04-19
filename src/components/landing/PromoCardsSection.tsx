import { Link, useLocation } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { ArrowUpRight, User, Briefcase } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

const CARDS = [
  { key: 'team', Icon: User },
  { key: 'services', Icon: Briefcase },
] as const

export function PromoCardsSection() {
  const { t } = useTranslation('landing')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)

  return (
    <section className="relative bg-background py-16 md:py-20">
      <div className={cn(designSystem.spacing.page.container, 'max-w-6xl')}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {CARDS.map(({ key, Icon }, i) => {
            const href = withLocalePath(t(`promos.${key}.href`), currentLocale)
            const image = t(`promos.${key}.image`)
            return (
              <motion.article
                key={key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card"
              >
                <Link to={href} className="block">
                  <div className="relative aspect-[3/2] overflow-hidden">
                    <img
                      src={image}
                      alt=""
                      aria-hidden
                      width={1600}
                      height={1067}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                        <Icon className="h-5 w-5" strokeWidth={1.8} />
                      </div>
                      <h3 className="font-heading text-2xl font-bold text-white md:text-3xl">
                        {t(`promos.${key}.label`)}
                      </h3>
                    </div>
                  </div>
                  <div className="p-6 md:p-8">
                    <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                      {t(`promos.${key}.description`)}
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors group-hover:text-primary/80">
                      {t(`promos.${key}.cta`)}
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
