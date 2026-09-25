import { Link, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { SlideUp } from '@/components/animations/FadeIn'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { SERVICE_IDS, SERVICE_ROUTES } from '@/lib/service-routes'
import { cn } from '@/lib/utils'

export function ServicesHexGrid() {
  const { t } = useTranslation('landing')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)

  return (
    <section className="relative overflow-hidden bg-background py-14 md:py-16">
      <div className="container relative z-30 mx-auto max-w-6xl px-6 lg:px-8">
        {/* Header */}
        <SlideUp className="mx-auto mb-9 max-w-3xl text-center">
          <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {t('services.subtitle')}
          </span>
          <h2
            className={cn(
              designSystem.typography.heading.h1,
              'landing-section-heading text-3xl font-bold text-foreground md:text-4xl',
            )}
          >
            {t('services.title')}
          </h2>
          <p
            className={cn(
              designSystem.typography.body.large,
              'landing-section-lead mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground',
            )}
          >
            {t('services.description')}
          </p>
        </SlideUp>

        {/* Service list */}
        <div className="grid gap-x-8 border-t border-border md:grid-cols-2">
          {SERVICE_IDS.map((serviceId, i) => (
            <SlideUp key={serviceId} delay={i * 0.06}>
              <Link
                to={withLocalePath(SERVICE_ROUTES[serviceId], currentLocale)}
                className={cn(
                  'group grid grid-cols-[2rem_1fr] gap-x-4 gap-y-1',
                  'border-b border-border py-4',
                  'transition-colors hover:bg-muted/30',
                )}
              >
                {/* Number */}
                <span className="text-sm font-bold text-primary">
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Title */}
                <span className="font-semibold text-foreground">
                  {t(`services.items.${serviceId}.title`)}
                </span>

                {/* Description */}
                <span className="col-start-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`services.items.${serviceId}.description`)}
                </span>

                {/* Arrow */}
                <span className="col-start-2 text-primary transition-transform group-hover:translate-x-1">
                  &rarr;
                </span>
              </Link>
            </SlideUp>
          ))}
        </div>
      </div>
    </section>
  )
}
