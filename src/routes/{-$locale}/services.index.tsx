import { ArrowRight } from 'lucide-react'
import { Link, createFileRoute, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionScroller } from '@/components/landing/SectionScroller'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import {
  SERVICE_IDS,
  SERVICE_INDEX_SECTION_IDS,
  SERVICE_ROUTES,
} from '@/lib/service-routes'
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
  const sectionLabels = locale.startsWith('bs')
    ? ['Pregled', 'Usluge', 'Početak']
    : ['Overview', 'Services', 'Start']

  return (
    <main className="bg-background">
      <SectionScroller
        labels={sectionLabels}
        ids={[...SERVICE_INDEX_SECTION_IDS]}
      >
        <section className="flex flex-col justify-center bg-background pt-8 pb-28 md:py-10">
          <PageContainer maxWidth="xl" spacing="none">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.55fr)] lg:items-end">
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

              <div className="border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pl-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t('index.introOverline')}
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {t('index.introTitle')}
                </h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">
                  {t('index.introBody')}
                </p>
              </div>
            </div>
          </PageContainer>
        </section>

        <section className="flex flex-col justify-center bg-muted/15 pt-8 pb-28 md:py-10">
          <PageContainer maxWidth="xl" spacing="none">
            <div className="mb-6 grid gap-4 lg:grid-cols-[0.5fr_1fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t('common.service')}
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  {t('index.introTitle')}
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:ml-auto md:text-right">
                {t('index.description')}
              </p>
            </div>

            <div className="divide-y divide-border border-y border-border">
              {SERVICE_IDS.map((serviceId) => {
                const service = t(`items.${serviceId}`, {
                  returnObjects: true,
                }) as ServiceSummary
                const href = withLocalePath(SERVICE_ROUTES[serviceId], locale)

                return (
                  <Link
                    key={serviceId}
                    to={href}
                    className="group grid gap-3 py-4 transition-colors hover:bg-background/65 md:grid-cols-[4.5rem_0.7fr_1fr_auto] md:items-center md:py-5"
                  >
                    <span className="text-sm font-semibold text-primary">
                      {service.label}
                    </span>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
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
            </div>
          </PageContainer>
        </section>

        <section className="flex flex-col justify-center bg-background pt-8 pb-28 md:py-10">
          <PageContainer maxWidth="xl" spacing="none">
            <div className="grid gap-8 border-y border-border py-10 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t('common.nextStep')}
                </p>
                <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                  {t('index.cta.title')}
                </h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                  {t('index.cta.description')}
                </p>
              </div>
              <Button asChild size="lg">
                <Link to={contactHref}>
                  {t('index.cta.button')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </PageContainer>
        </section>
      </SectionScroller>
    </main>
  )
}
