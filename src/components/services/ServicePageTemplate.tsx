import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
} from 'lucide-react'
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

const SERVICE_IMAGES: Partial<
  Record<ServiceId, { hero: string; interior: string }>
> = {
  bookkeeping: {
    hero: '/pages/bookkeeping-hero.webp',
    interior: '/pages/bookkeeping-interior.webp',
  },
  taxConsulting: {
    hero: '/pages/tax-consulting-hero.jpg',
    interior: '/pages/tax-consulting-interior.jpg',
  },
  virtualCfo: {
    hero: '/pages/virtual-cfo-hero.jpg',
    interior: '/pages/virtual-cfo-interior.jpg',
  },
  businessConsulting: {
    hero: '/pages/business-consulting-hero.jpg',
    interior: '/pages/business-consulting-interior.jpg',
  },
  financialReporting: {
    hero: '/pages/financial-reporting-hero.jpg',
    interior: '/pages/financial-reporting-interior.jpg',
  },
  education: {
    hero: '/pages/education-hero.webp',
    interior: '/pages/education-interior.jpg',
  },
}

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
    ? ['Pregled', 'Obim', 'Proces', 'Isporuke']
    : ['Overview', 'Scope', 'Process', 'Outputs']
}

export function ServicePageTemplate({ serviceId }: ServicePageTemplateProps) {
  const { t } = useTranslation('services')
  const location = useLocation()
  const locale = getLocaleFromPath(location.pathname)
  const contactHref = withLocalePath('/contact', locale)
  const servicesHref = withLocalePath('/services', locale)
  const sectionLabels = getServiceSectionLabels(locale)
  const images = SERVICE_IMAGES[serviceId]
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
        {/* ── Panel 1: Hero ─────────────────────────────────── */}
        <section className="relative isolate flex flex-col justify-center overflow-hidden bg-background">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-primary/[0.055] via-background to-background"
          />
          <div className="mx-auto w-full max-w-7xl px-6 py-10 md:px-12 lg:py-12 xl:px-20">
            <Link
              to={servicesHref}
              className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('common.backToServices')}
            </Link>

            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(28rem,1fr)] xl:gap-14">
              <div>
                <div className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em]">
                  <span className="text-primary">{service.label}</span>
                  <span className="h-px w-8 bg-border" aria-hidden />
                  <span className="text-muted-foreground">
                    {t('common.service')}
                  </span>
                </div>
                <h1
                  className={cn(
                    designSystem.typography.display.heroCompact,
                    'max-w-3xl text-balance text-foreground',
                  )}
                >
                  {service.title}
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                  {service.heroDescription}
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
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

                <div className="mt-9 rounded-lg border border-border/80 bg-background/80 p-5 shadow-xs">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full bg-primary"
                    />
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {service.bestForTitle}
                    </p>
                  </div>
                  <ul className="mt-4 grid gap-3">
                    {service.bestFor.map((item) => (
                      <li
                        key={item}
                        className="grid grid-cols-[1.25rem_1fr] gap-3 text-sm leading-6 text-foreground"
                      >
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 text-primary"
                          aria-hidden
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {images && (
                <figure className="relative">
                  <div className="relative overflow-hidden rounded-[10px] border border-border/80 bg-muted shadow-[0_18px_50px_rgba(23,18,10,0.12)]">
                    <img
                      src={images.hero}
                      alt={service.title}
                      className="aspect-[3/2] w-full object-cover"
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                    />
                    <figcaption className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-md border border-white/25 bg-background/90 px-4 py-3 text-sm font-medium text-foreground shadow-sm backdrop-blur-md">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                        <ClipboardCheck className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="text-balance">
                        {service.overviewTitle}
                      </span>
                    </figcaption>
                  </div>
                </figure>
              )}
            </div>
          </div>
        </section>

        {/* ── Panel 2: Scope ────────────────────────────────── */}
        <ServicePanel muted>
          <PageContainer maxWidth="xl" spacing="none">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)] lg:items-start xl:gap-14">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t('common.scope')}
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  {service.detailsTitle}
                </h2>
                <p className="mt-5 text-base leading-8 text-muted-foreground md:text-lg">
                  {service.overview}
                </p>
              </div>

              <div className="grid gap-4">
                {service.details.map((detail, index) => (
                  <article
                    key={detail.title}
                    className="rounded-lg border border-border/80 bg-background/75 p-5 shadow-xs"
                  >
                    <div className="grid gap-4 sm:grid-cols-[3rem_1fr]">
                      <span className="text-sm font-semibold text-primary">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          {detail.title}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">
                          {detail.description}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </PageContainer>
        </ServicePanel>

        {/* ── Panel 3: Process ──────────────────────────────── */}
        <ServicePanel>
          <PageContainer maxWidth="xl" spacing="none">
            <div className="grid gap-10 lg:grid-cols-[minmax(18rem,0.42fr)_minmax(0,1fr)] lg:items-start xl:gap-14">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t('common.process')}
                </p>
                <h2 className="mt-3 max-w-sm text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  {service.processTitle}
                </h2>
              </div>

              <ol className="grid gap-4 md:grid-cols-3">
                {service.process.map((step, index) => (
                  <li key={step.title}>
                    <article className="flex h-full flex-col border-t border-border pt-5">
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
                  </li>
                ))}
              </ol>
            </div>
          </PageContainer>
        </ServicePanel>

        {/* ── Panel 4: Deliverables + CTA ───────────────────── */}
        <ServicePanel>
          <PageContainer maxWidth="xl" spacing="none">
            {/* Full-width image break */}
            {images && (
              <div className="mb-12 overflow-hidden rounded-xl border border-border">
                <img
                  src={images.interior}
                  alt={service.deliverablesTitle}
                  className="aspect-[21/9] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            )}

            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.5fr)] lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {sectionLabels[3]}
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

              <div className="rounded-xl border border-border bg-muted/20 p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t('common.nextStep')}
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {service.cta.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">
                  {service.cta.description}
                </p>
                <Button asChild size="lg" className="mt-7 w-full">
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
