import { ArrowRight } from 'lucide-react'
import { Link, createFileRoute, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout/PageContainer'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { SERVICE_IDS, SERVICE_ROUTES } from '@/lib/service-routes'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/{-$locale}/services/')({
  head: () => ({
    meta: [
      { title: 'Services — Start HN' },
      {
        name: 'description',
        content:
          'Explore Start HN accounting services: bookkeeping, tax consulting, Virtual CFO, business consulting, financial reporting, and education.',
      },
      { property: 'og:title', content: 'Services — Start HN' },
      {
        property: 'og:description',
        content:
          'Explore Start HN accounting services: bookkeeping, tax consulting, Virtual CFO, business consulting, financial reporting, and education.',
      },
    ],
  }),
  component: ServicesIndexPage,
})

type ServiceSummary = {
  label: string
  title: string
  shortDescription: string
}

function ServicesIndexPage() {
  const { t } = useTranslation('services')
  const location = useLocation()
  const locale = getLocaleFromPath(location.pathname)
  const contactHref = withLocalePath('/contact', locale)

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border/70 pt-28 pb-12 md:pt-32 md:pb-16">
        <PageContainer maxWidth="xl" spacing="none">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_0.3fr] lg:items-end">
            <div className="max-w-3xl">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t('index.overline')}
              </p>
              <h1
                className={cn(
                  designSystem.typography.display.heroCompact,
                  'text-balance text-foreground',
                )}
              >
                {t('index.title')}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {t('index.description')}
              </p>
            </div>
            <div className="flex lg:justify-end">
              <Button asChild size="lg">
                <Link to={contactHref}>
                  {t('index.cta.button')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </PageContainer>
      </section>

      <PageContainer maxWidth="xl" spacing="lg">
        <section className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[0.42fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t('index.introOverline')}
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {t('index.introTitle')}
            </h2>
          </div>
          <p className="max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
            {t('index.introBody')}
          </p>
        </section>

        <section className="divide-y divide-border">
          {SERVICE_IDS.map((serviceId) => {
            const service = t(`items.${serviceId}`, {
              returnObjects: true,
            }) as ServiceSummary
            const href = withLocalePath(SERVICE_ROUTES[serviceId], locale)

            return (
              <Link
                key={serviceId}
                to={href}
                className="group grid gap-4 py-6 transition-colors hover:bg-muted/30 md:grid-cols-[5rem_0.8fr_1fr_auto] md:items-start"
              >
                <span className="text-sm font-semibold text-primary">
                  {service.label}
                </span>
                <h3 className="text-xl font-semibold tracking-tight text-foreground">
                  {service.title}
                </h3>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                  {service.shortDescription}
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-transform group-hover:translate-x-1">
                  {t('common.learnMore')}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            )
          })}
        </section>

        <section className="grid gap-6 border-t border-border pt-10 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {t('index.cta.title')}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              {t('index.cta.description')}
            </p>
          </div>
          <Button asChild size="lg" variant="outline">
            <Link to={contactHref}>{t('index.cta.button')}</Link>
          </Button>
        </section>
      </PageContainer>
    </main>
  )
}
