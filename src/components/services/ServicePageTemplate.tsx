import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import type { ServiceId } from '@/lib/service-routes'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionScroller } from '@/components/landing/SectionScroller'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { SERVICE_DETAIL_SECTION_IDS } from '@/lib/service-routes'
import { cn } from '@/lib/utils'

type TextBlock = {
  title: string
  description: string
}

type ServiceContent = {
  label: string
  title: string
  shortDescription: string
  heroDescription: string
  overviewTitle: string
  overview: string
  bestForTitle: string
  bestFor: Array<string>
  detailsTitle: string
  details: Array<TextBlock>
  processTitle: string
  process: Array<TextBlock>
  deliverablesTitle: string
  deliverables: Array<string>
  cta: {
    title: string
    description: string
    button: string
  }
}

interface ServicePageTemplateProps {
  serviceId: ServiceId
}

function isServiceContent(value: unknown): value is ServiceContent {
  return !!value && typeof value === 'object' && 'title' in value
}

function getServiceSectionLabels(locale: string) {
  return locale.startsWith('bs')
    ? ['Pregled', 'Proces', 'Isporuke']
    : ['Overview', 'Process', 'Outputs']
}

export function ServicePageTemplate({ serviceId }: ServicePageTemplateProps) {
  const { t } = useTranslation('services')
  const location = useLocation()
  const locale = getLocaleFromPath(location.pathname)
  const contactHref = withLocalePath('/contact', locale)
  const servicesHref = withLocalePath('/services', locale)
  const sectionLabels = getServiceSectionLabels(locale)
  const rawContent = t(`items.${serviceId}`, { returnObjects: true })
  const service = isServiceContent(rawContent)
    ? rawContent
    : ({
        label: '',
        title: t('common.fallbackTitle'),
        shortDescription: '',
        heroDescription: '',
        overviewTitle: '',
        overview: '',
        bestForTitle: '',
        bestFor: [],
        detailsTitle: '',
        details: [],
        processTitle: '',
        process: [],
        deliverablesTitle: '',
        deliverables: [],
        cta: {
          title: '',
          description: '',
          button: t('common.ctaPrimary'),
        },
      } satisfies ServiceContent)

  return (
    <main className="bg-background">
      <SectionScroller
        labels={sectionLabels}
        ids={[...SERVICE_DETAIL_SECTION_IDS]}
      >
        <ServicePanel>
          <PageContainer maxWidth="xl" spacing="none">
            <Link
              to={servicesHref}
              className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('common.backToServices')}
            </Link>

            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.55fr)] lg:items-end">
              <div className="max-w-3xl">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {service.label} / {t('common.service')}
                </p>
                <h1
                  className={cn(
                    designSystem.typography.display.heroCompact,
                    'max-w-4xl text-balance text-foreground',
                  )}
                >
                  {service.title}
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  {service.heroDescription}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg">
                    <Link to={contactHref}>
                      {t('common.ctaPrimary')}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to={servicesHref}>{t('common.ctaSecondary')}</Link>
                  </Button>
                </div>
              </div>

              <div className="border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pl-8">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {service.bestForTitle}
                </p>
                <ul className="mt-5 divide-y divide-border/70 border-y border-border/70">
                  {service.bestFor.map((item) => (
                    <li
                      key={item}
                      className="py-3 text-sm leading-relaxed text-foreground"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </PageContainer>
        </ServicePanel>

        <ServicePanel muted>
          <PageContainer maxWidth="xl" spacing="none">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,0.48fr)]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t('common.scope')}
                </p>
                <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  {service.detailsTitle}
                </h2>
                <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
                  {service.overview}
                </p>

                <div className="mt-7 divide-y divide-border border-y border-border">
                  {service.details.map((detail, index) => (
                    <article
                      key={detail.title}
                      className="grid gap-3 py-4 md:grid-cols-[4rem_1fr]"
                    >
                      <span className="text-sm font-semibold text-primary">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          {detail.title}
                        </h3>
                        <p className="mt-1.5 text-sm leading-7 text-muted-foreground">
                          {detail.description}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <aside className="border-t border-border pt-6 xl:border-t-0 xl:border-l xl:pl-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t('common.process')}
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {service.processTitle}
                </h2>
                <div className="mt-6 space-y-5">
                  {service.process.map((step, index) => (
                    <article key={step.title} className="border-t border-border pt-5">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h3 className="mt-3 text-base font-semibold text-foreground">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {step.description}
                      </p>
                    </article>
                  ))}
                </div>
              </aside>
            </div>
          </PageContainer>
        </ServicePanel>

        <ServicePanel>
          <PageContainer maxWidth="xl" spacing="none">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(19rem,0.55fr)] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t('common.outputs')}
                </p>
                <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  {service.deliverablesTitle}
                </h2>
                <ul className="mt-7 grid gap-x-8 gap-y-3 border-y border-border py-5 sm:grid-cols-2">
                  {service.deliverables.map((deliverable) => (
                    <li
                      key={deliverable}
                      className="border-b border-border/70 pb-3 text-sm leading-7 text-foreground last:border-b-0"
                    >
                      {deliverable}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-y border-border py-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t('common.nextStep')}
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {service.cta.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">
                  {service.cta.description}
                </p>
                <Button asChild size="lg" className="mt-7">
                  <Link to={contactHref}>
                    {service.cta.button}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </PageContainer>
        </ServicePanel>
      </SectionScroller>
    </main>
  )
}

function ServicePanel({
  children,
  muted = false,
}: {
  children: ReactNode
  muted?: boolean
}) {
  return (
    <section
      className={cn(
        'flex flex-col justify-center pt-8 pb-28 md:py-10',
        muted ? 'bg-muted/15' : 'bg-background',
      )}
    >
      {children}
    </section>
  )
}
