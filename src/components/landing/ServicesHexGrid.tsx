import { Link, useLocation } from '@tanstack/react-router'
import { ArrowRight, Calculator, FileSpreadsheet, TrendingUp } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.05,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}

const serviceIcons = [Calculator, FileSpreadsheet, TrendingUp]

export function ServicesHexGrid() {
  const { t } = useTranslation('landing')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const contactHref = withLocalePath('/contact', currentLocale)
  const servicesHref = withLocalePath('/services', currentLocale)

  const services = [
    {
      key: 'accounting',
      Icon: Calculator,
      href: '/services#accounting',
    },
    {
      key: 'tax',
      Icon: FileSpreadsheet,
      href: '/services#tax',
    },
    {
      key: 'virtualCfo',
      Icon: TrendingUp,
      href: '/services#virtual-cfo',
    },
  ]

  return (
    <section className="relative py-24 bg-gradient-to-b from-background via-primary/[0.03] to-background overflow-hidden">
      <div className="container mx-auto px-6 lg:px-8 relative z-30 max-w-7xl">
        {/* Header */}
        <motion.div
          className="text-center mb-16 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground/80 mb-3 block">
            {t('services.subtitle')}
          </span>
          <h2
            className={cn(
              designSystem.typography.heading.h1,
              'text-4xl md:text-5xl font-bold text-foreground'
            )}
          >
            {t('services.title')}
          </h2>
          <p className={cn(designSystem.typography.body.large, 'text-muted-foreground mt-4')}>
            {t('services.description')}
          </p>
        </motion.div>

        {/* Service Cards - 3 column grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {services.map((service) => {
            const Icon = service.Icon
            return (
              <motion.div key={service.key} variants={cardVariants} className="h-full">
                <Link
                  to={withLocalePath(service.href.split('#')[0], currentLocale)}
                  className={cn(
                    'block h-full rounded-2xl border border-border bg-card/80 p-8',
                    'transition-all duration-300',
                    'hover:border-primary/40 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/10',
                    'group'
                  )}
                >
                  <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {t(`services.items.${service.key}.title`)}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t(`services.items.${service.key}.description`)}
                  </p>
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    {t('services.learnMore')}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>

        {/* CTA Card */}
        <motion.div
          className={cn(
            'relative rounded-2xl p-8 lg:p-12 text-center overflow-hidden',
            'bg-card/85 border border-border',
            'dark:bg-card dark:border-primary/20'
          )}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary/80 dark:bg-primary/40" />
          <div className="relative z-10">
            <h3
              className={cn(
                designSystem.typography.heading.h2,
                'mb-4 text-2xl lg:text-3xl font-bold text-foreground'
              )}
            >
              {t('services.cta.title')}
            </h3>
            <p
              className={cn(
                designSystem.typography.body.large,
                'text-muted-foreground mb-8 max-w-2xl mx-auto'
              )}
            >
              {t('services.cta.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="landing-cta-primary">
                <Link to={contactHref}>
                  {t('services.cta.primary')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="tel:+38761135377">
                  {t('services.cta.secondary')}
                </a>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
