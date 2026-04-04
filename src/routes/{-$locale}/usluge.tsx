import { createFileRoute, Link, useLocation } from '@tanstack/react-router'
import { Calculator, FileSpreadsheet, TrendingUp, ArrowRight, Check } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/{-$locale}/usluge')({
  component: UslugePageComponent,
})

const serviceData = [
  { key: 'accounting', Icon: Calculator, anchor: 'racunovodstvo' },
  { key: 'tax', Icon: FileSpreadsheet, anchor: 'porezi' },
  { key: 'virtualCfo', Icon: TrendingUp, anchor: 'virtualni-cfo' },
]

function UslugePageComponent() {
  const { t } = useTranslation('services')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const contactHref = withLocalePath('/contact', currentLocale)

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
        {/* Page Header */}
        <motion.div
          className="text-center mb-20 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground/80 mb-3 block">
            {t('overview.badge')}
          </span>
          <h1 className={cn(designSystem.typography.heading.h1, 'text-4xl md:text-5xl lg:text-6xl font-bold mb-6')}>
            {t('overview.title')}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t('overview.description')}
          </p>
        </motion.div>

        {/* Service Sections */}
        <div className="space-y-24">
          {serviceData.map((service, index) => {
            const Icon = service.Icon
            const features = t(`${service.key}.features`, { returnObjects: true }) as string[]
            const isEven = index % 2 === 0

            return (
              <motion.section
                key={service.key}
                id={service.anchor}
                className="scroll-mt-24"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6 }}
              >
                <div className={cn(
                  'grid grid-cols-1 lg:grid-cols-2 gap-12 items-center',
                  !isEven && 'lg:grid-flow-dense'
                )}>
                  {/* Content */}
                  <div className={!isEven ? 'lg:col-start-2' : ''}>
                    <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className={cn(designSystem.typography.heading.h2, 'text-3xl md:text-4xl font-bold mb-4')}>
                      {t(`${service.key}.title`)}
                    </h2>
                    <p className="text-lg text-muted-foreground mb-2">
                      {t(`${service.key}.subtitle`)}
                    </p>
                    <p className="text-muted-foreground mb-8">
                      {t(`${service.key}.description`)}
                    </p>
                    <Button asChild size="lg">
                      <Link to={contactHref}>
                        {t('common.ctaPrimary')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>

                  {/* Features list */}
                  <div className={cn(
                    'rounded-2xl border border-border bg-card/80 p-8',
                    !isEven ? 'lg:col-start-1' : ''
                  )}>
                    <h3 className="text-lg font-semibold mb-6 text-foreground">
                      Šta uključuje:
                    </h3>
                    <ul className="space-y-4">
                      {Array.isArray(features) && features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.section>
            )
          })}
        </div>

        {/* Additional Services */}
        <motion.div
          className="mt-24 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 lg:p-12 max-w-4xl mx-auto">
            <h2 className={cn(designSystem.typography.heading.h2, 'text-2xl lg:text-3xl font-bold mb-6')}>
              {t('additional.title')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left max-w-2xl mx-auto">
              {(t('additional.items', { returnObjects: true }) as string[]).map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
            <Button asChild size="lg">
              <Link to={contactHref}>
                {t('common.ctaPrimary')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
