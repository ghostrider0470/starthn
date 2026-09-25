import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Phone,
} from 'lucide-react'
import { Link, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import type { ServiceId } from '@/lib/service-routes'
import i18n from '@/i18n'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionScroller } from '@/components/landing/SectionScroller'
import {
  CallLink,
  GoogleRatingLink,
  useCallLabels,
  useOwnLocaleText,
} from '@/components/ContactActions'
import { designSystem } from '@/lib/design-system'
import {
  DEFAULT_LOCALE,
  getLocaleFromPath,
  isValidLocale,
  withLocalePath,
} from '@/lib/i18n-utils'
import {
  SERVICE_DETAIL_SECTION_IDS,
  SERVICE_IDS,
  SERVICE_ROUTES,
} from '@/lib/service-routes'
import { cn } from '@/lib/utils'

type ServiceImages = {
  /** `/pages/<name>-hero` — files are `<hero>-<width>.webp`, cropped 3:2. */
  hero: string
  /** Widths that exist for the hero (never upscaled past the source). */
  heroWidths: ReadonlyArray<number>
  interior: string
}

const SERVICE_IMAGES: Partial<Record<ServiceId, ServiceImages>> = {
  bookkeeping: {
    hero: '/pages/bookkeeping-hero',
    heroWidths: [640, 960, 1280],
    interior: '/pages/bookkeeping-interior.webp',
  },
  taxConsulting: {
    hero: '/pages/tax-consulting-hero',
    heroWidths: [640, 960, 1024],
    interior: '/pages/tax-consulting-interior.webp',
  },
  virtualCfo: {
    hero: '/pages/virtual-cfo-hero',
    heroWidths: [640, 960, 1280],
    interior: '/pages/virtual-cfo-interior.webp',
  },
  businessConsulting: {
    hero: '/pages/business-consulting-hero',
    heroWidths: [640, 960, 1024],
    interior: '/pages/business-consulting-interior.webp',
  },
  financialReporting: {
    hero: '/pages/financial-reporting-hero',
    heroWidths: [640, 960, 1024],
    interior: '/pages/financial-reporting-interior.webp',
  },
  education: {
    hero: '/pages/education-hero',
    heroWidths: [640, 960, 1280],
    interior: '/pages/education-interior.webp',
  },
}

/**
 * The hero photo's rendered width: the right grid column from lg (at most
 * ~560px), otherwise the page width minus the hero padding (px-6, md:px-12).
 */
export const SERVICE_HERO_IMAGE_SIZES = [
  '(min-width: 1024px) 560px',
  '(min-width: 768px) calc(100vw - 6rem)',
  'calc(100vw - 3rem)',
].join(', ')

/** src, srcSet and intrinsic size of a service hero photo (3:2). */
export function serviceHeroImage(images: ServiceImages) {
  const widths = [...images.heroWidths].sort((a, b) => a - b)
  const largest = widths[widths.length - 1]
  return {
    src: `${images.hero}-${largest}.webp`,
    srcSet: widths.map((w) => `${images.hero}-${w}.webp ${w}w`).join(', '),
    width: largest,
    height: Math.round((largest * 2) / 3),
  }
}

type TextBlock = {
  title: string
  description: string
}

type FaqItem = {
  question: string
  answer: string
}

type PricingPlan = {
  name: string
  price: string
  period: string
  note?: string
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
  /** Search-oriented H1; falls back to `title`. */
  heroTitle?: string
  interiorAlt?: string
  localContextTitle?: string
  localContext?: string
  /** Sibling services to cross-link. */
  related?: Array<ServiceId>
  /** Blog post slugs to link. */
  relatedPosts?: Array<string>
  /** Visible FAQ (plain headings and paragraphs; no FAQPage markup). */
  faq?: { title: string; items: Array<FaqItem> }
  /** "Od" prices already published on the site (bookkeeping). */
  pricing?: {
    title: string
    intro?: string
    plans: Array<PricingPlan>
    driversTitle?: string
    drivers?: Array<string>
    note?: string
  }
  /** Payroll H2 with an anchor (bookkeeping). */
  payroll?: { title: string; body: string }
}

interface ServicePageTemplateProps {
  serviceId: ServiceId
}

function isServiceContent(value: unknown): value is ServiceContent {
  return !!value && typeof value === 'object' && 'title' in value
}

// common:sections.* keys for the four SERVICE_DETAIL_SECTION_IDS panels.
const SECTION_LABEL_KEYS = ['overview', 'scope', 'process', 'outputs'] as const

/**
 * Scroller labels in the page's locale. The last one is also shown as the
 * deliverables eyebrow, so a locale without common:sections.* uses the
 * matching services:common.* label instead of a raw key. The check ignores
 * fallback languages so server and client pick the same string.
 */
function getServiceSectionLabels(locale: string) {
  const lng = isValidLocale(locale) ? locale : DEFAULT_LOCALE
  const t = i18n.getFixedT(lng, 'common')
  const tServices = i18n.getFixedT(lng, 'services')
  return SECTION_LABEL_KEYS.map((key) =>
    i18n.exists(`sections.${key}`, { lng, ns: 'common', fallbackLng: false })
      ? t(`sections.${key}`)
      : tServices(`common.${key}`),
  )
}

/**
 * Scroller label of the FAQ panel: common:sections.faq, else the services
 * FAQ eyebrow, else '' (the scroller then says "go to section N").
 */
function getFaqSectionLabel(locale: string) {
  const lng = isValidLocale(locale) ? locale : DEFAULT_LOCALE
  if (i18n.exists('sections.faq', { lng, ns: 'common', fallbackLng: false })) {
    return i18n.getFixedT(lng, 'common')('sections.faq')
  }
  if (
    i18n.exists('common.faqOverline', {
      lng,
      ns: 'services',
      fallbackLng: false,
    })
  ) {
    return i18n.getFixedT(lng, 'services')('common.faqOverline')
  }
  return ''
}

function isFaqItem(value: unknown): value is FaqItem {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.question === 'string' && typeof item.answer === 'string'
}

function isServiceId(value: unknown): value is ServiceId {
  return (SERVICE_IDS as ReadonlyArray<unknown>).includes(value)
}

export function ServicePageTemplate({ serviceId }: ServicePageTemplateProps) {
  const { t, i18n: i18nInstance } = useTranslation('services')
  const text = useOwnLocaleText('services')
  const callLabels = useCallLabels()
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
        related: [],
        relatedPosts: [],
      } satisfies ServiceContent)

  const faqItems = (
    Array.isArray(service.faq?.items) ? (service.faq.items as Array<unknown>) : []
  ).filter(isFaqItem)
  const pricing =
    service.pricing && Array.isArray(service.pricing.plans)
      ? service.pricing
      : null
  const payroll =
    service.payroll && typeof service.payroll.title === 'string'
      ? service.payroll
      : null

  // The FAQ gets its own panel (before the closing CTA) where a locale has
  // one; the scroller's ids and labels follow the rendered panels.
  const hasFaq = faqItems.length > 0
  const panelIds: Array<string> = hasFaq
    ? ['overview', 'scope', 'process', 'faq', 'deliverables']
    : [...SERVICE_DETAIL_SECTION_IDS]
  const panelLabels = hasFaq
    ? [
        sectionLabels[0],
        sectionLabels[1],
        sectionLabels[2],
        getFaqSectionLabel(locale),
        sectionLabels[3],
      ]
    : sectionLabels
  const heroImage = images ? serviceHeroImage(images) : null

  const relatedServices = (
    Array.isArray(service.related) ? service.related : []
  ).filter((id) => isServiceId(id) && id !== serviceId)
  // Only link posts that have a label in this locale's own bundle (not a
  // fallback language that only the SSR store may hold), so server and client
  // render the same list.
  const relatedPosts = (
    Array.isArray(service.relatedPosts) ? service.relatedPosts : []
  ).filter(
    (slug) =>
      typeof slug === 'string' &&
      i18nInstance.exists(`related.postLabels.${slug}`, {
        ns: 'services',
        fallbackLng: false,
      }),
  )

  // A div, not <main>: the root layout already has the page's main landmark.
  return (
    <div className="bg-background">
      <SectionScroller labels={panelLabels} ids={panelIds}>
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
                  {service.heroTitle ?? service.title}
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                  {service.heroDescription}
                </p>

                {/* "Back to services" above already links the overview, so
                    the second hero action is tap-to-call. */}
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button asChild size="lg">
                    <Link to={contactHref}>
                      {t('common.ctaPrimary')}
                      <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <CallLink placement="service_hero">
                      <Phone aria-hidden className="h-4 w-4" />
                      <span className="tabular-nums">
                        {callLabels.callNumber}
                      </span>
                    </CallLink>
                  </Button>
                </div>
                <GoogleRatingLink className="mt-2" />

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
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {heroImage && (
                <figure className="relative">
                  <div className="relative overflow-hidden rounded-[10px] border border-border/80 bg-muted shadow-[0_18px_50px_rgba(23,18,10,0.12)]">
                    {/* The desktop LCP element: eager, high priority, sized. */}
                    <img
                      src={heroImage.src}
                      srcSet={heroImage.srcSet}
                      sizes={SERVICE_HERO_IMAGE_SIZES}
                      width={heroImage.width}
                      height={heroImage.height}
                      alt={service.title}
                      className="aspect-[3/2] w-full object-cover"
                      loading="eager"
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

            {service.localContext && (
              <section
                aria-labelledby={`${serviceId}-local-context`}
                className="mt-12 grid gap-4 border-t border-border/70 pt-8 lg:mt-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(28rem,1fr)] lg:gap-10 xl:gap-14"
              >
                <h2
                  id={`${serviceId}-local-context`}
                  className="max-w-xl text-2xl font-bold tracking-tight text-balance text-foreground md:text-3xl"
                >
                  {service.localContextTitle}
                </h2>
                <p className="text-base leading-8 text-muted-foreground">
                  {service.localContext}
                </p>
              </section>
            )}

            {pricing && (
              <section
                id="cijene"
                aria-labelledby={`${serviceId}-pricing`}
                data-testid="service-pricing"
                className="mt-12 scroll-mt-20 border-t border-border/70 pt-8 lg:mt-14"
              >
                {text('common.pricingOverline', '') && (
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    {text('common.pricingOverline', '')}
                  </p>
                )}
                <h2
                  id={`${serviceId}-pricing`}
                  className="mt-3 text-2xl font-bold tracking-tight text-balance text-foreground md:text-3xl"
                >
                  {pricing.title}
                </h2>
                {pricing.intro && (
                  <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
                    {pricing.intro}
                  </p>
                )}
                <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_minmax(0,1.25fr)]">
                  {pricing.plans.map((plan) => (
                    <div
                      key={plan.name}
                      className="rounded-lg border border-border/80 bg-card p-5 shadow-xs"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {plan.name}
                      </p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                        {plan.price}{' '}
                        <span className="text-base font-medium text-muted-foreground">
                          {plan.period}
                        </span>
                      </p>
                      {plan.note && (
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {plan.note}
                        </p>
                      )}
                    </div>
                  ))}
                  {pricing.drivers && pricing.drivers.length > 0 && (
                    <div className="rounded-lg border border-border/80 bg-background/80 p-5 md:col-span-2 lg:col-span-1">
                      {pricing.driversTitle && (
                        <h3 className="text-sm font-semibold text-foreground">
                          {pricing.driversTitle}
                        </h3>
                      )}
                      <ul className="mt-3 grid gap-2">
                        {pricing.drivers.map((driver) => (
                          <li
                            key={driver}
                            className="grid grid-cols-[1.25rem_1fr] gap-2 text-sm leading-6 text-foreground"
                          >
                            <CheckCircle2
                              className="mt-1 h-4 w-4 text-primary"
                              aria-hidden
                            />
                            <span>{driver}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {pricing.note && (
                  <p className="mt-5 max-w-3xl text-sm leading-7 text-muted-foreground">
                    {pricing.note}
                  </p>
                )}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                  <Button asChild size="lg">
                    <Link to={contactHref}>
                      {text('common.requestQuote', t('common.ctaPrimary'))}
                      <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                  </Button>
                  {text('common.quoteNote', '') && (
                    <p className="text-sm text-muted-foreground">
                      {text('common.quoteNote', '')}
                    </p>
                  )}
                </div>
              </section>
            )}
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

            {payroll && (
              <section
                id="obracun-plata"
                aria-labelledby={`${serviceId}-payroll`}
                className="mt-12 grid scroll-mt-20 gap-4 border-t border-border/70 pt-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)] lg:gap-10 xl:gap-14"
              >
                <h2
                  id={`${serviceId}-payroll`}
                  className="max-w-xl text-2xl font-bold tracking-tight text-balance text-foreground md:text-3xl"
                >
                  {payroll.title}
                </h2>
                <p className="text-base leading-8 text-muted-foreground">
                  {payroll.body}
                </p>
              </section>
            )}
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

        {/* ── FAQ (where the locale has one) ───────────────── */}
        {hasFaq && (
          <ServicePanel muted>
            <PageContainer maxWidth="xl" spacing="none">
              <section
                aria-labelledby={`${serviceId}-faq`}
                data-testid="service-faq"
                className="grid gap-10 lg:grid-cols-[minmax(18rem,0.42fr)_minmax(0,1fr)] lg:items-start xl:gap-14"
              >
                <div>
                  {text('common.faqOverline', '') && (
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      {text('common.faqOverline', '')}
                    </p>
                  )}
                  <h2
                    id={`${serviceId}-faq`}
                    className="mt-3 max-w-sm text-3xl font-bold tracking-tight text-foreground md:text-4xl"
                  >
                    {service.faq?.title}
                  </h2>
                </div>
                {/* Plain questions and answers, all visible (no accordion,
                    no FAQPage markup). */}
                <div className="divide-y divide-border border-y border-border">
                  {faqItems.map((item) => (
                    <div key={item.question} className="py-5">
                      <h3 className="text-base font-semibold text-foreground">
                        {item.question}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground md:text-base">
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </PageContainer>
          </ServicePanel>
        )}

        {/* ── Panel 4: Deliverables + CTA ───────────────────── */}
        <ServicePanel>
          <PageContainer maxWidth="xl" spacing="none">
            {/* Full-width image break */}
            {images && (
              <div className="mb-12 overflow-hidden rounded-xl border border-border">
                <img
                  src={images.interior}
                  alt={
                    service.interiorAlt ??
                    `${service.title} – ${service.deliverablesTitle}`
                  }
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

                {(relatedServices.length > 0 || relatedPosts.length > 0) && (
                  <div className="mt-10 grid gap-8 sm:grid-cols-2">
                    {relatedServices.length > 0 && (
                      <section aria-labelledby={`${serviceId}-related-services`}>
                        <h2
                          id={`${serviceId}-related-services`}
                          className="text-lg font-semibold tracking-tight text-foreground"
                        >
                          {t('related.title', {
                            defaultValue: 'Povezane usluge',
                          })}
                        </h2>
                        <ul className="mt-3 grid gap-2">
                          {relatedServices.map((id) => (
                            <li key={id}>
                              <RelatedLink
                                to={withLocalePath(SERVICE_ROUTES[id], locale)}
                              >
                                {t(`items.${id}.title`)}
                              </RelatedLink>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                    {relatedPosts.length > 0 && (
                      <section aria-labelledby={`${serviceId}-related-posts`}>
                        <h2
                          id={`${serviceId}-related-posts`}
                          className="text-lg font-semibold tracking-tight text-foreground"
                        >
                          {t('related.postsTitle', {
                            defaultValue: 'Povezani članci',
                          })}
                        </h2>
                        <ul className="mt-3 grid gap-2">
                          {relatedPosts.map((slug) => (
                            <li key={slug}>
                              <RelatedLink
                                to={withLocalePath(`/blog/${slug}`, locale)}
                              >
                                {t(`related.postLabels.${slug}`)}
                              </RelatedLink>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                  </div>
                )}
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
    </div>
  )
}

function RelatedLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-start gap-2 text-sm font-medium leading-6 text-foreground underline decoration-primary/50 underline-offset-4 transition-colors hover:decoration-primary"
    >
      <span>{children}</span>
      <ArrowRight
        className="mt-1 h-3.5 w-3.5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
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
