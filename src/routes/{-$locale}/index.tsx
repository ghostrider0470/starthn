import { Link, createFileRoute, useLocation } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { ArrowRight, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { LandingPageLayout } from '@/components/landing/LandingPageLayout'
import { HeroSection } from '@/components/landing/HeroSection'
import { SectionScroller } from '@/components/landing/SectionScroller'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { getSectionLabels } from '@/lib/section-labels'
import { buildWebSiteStructuredData, jsonLd } from '@/lib/seo'
import { localizedPageHead } from '@/lib/seo-meta'

const ServicesHexGrid = lazy(() =>
  import('@/components/landing/ServicesHexGrid').then((m) => ({
    default: m.ServicesHexGrid,
  })),
)
const WhyStartHNSection = lazy(() =>
  import('@/components/landing/WhyStartHNSection').then((m) => ({
    default: m.WhyStartHNSection,
  })),
)
const StatsSection = lazy(() =>
  import('@/components/landing/StatsSection').then((m) => ({
    default: m.StatsSection,
  })),
)
const ValuesSection = lazy(() =>
  import('@/components/landing/ValuesSection').then((m) => ({
    default: m.ValuesSection,
  })),
)
const TestimonialsSection = lazy(() =>
  import('@/components/landing/TestimonialsSection').then((m) => ({
    default: m.TestimonialsSection,
  })),
)
const ContactCtaSection = lazy(() =>
  import('@/components/landing/ContactCtaSection').then((m) => ({
    default: m.ContactCtaSection,
  })),
)
const ClientLogosSection = lazy(() =>
  import('@/components/landing/ClientLogosSection').then((m) => ({
    default: m.ClientLogosSection,
  })),
)
const FAQSection = lazy(() =>
  import('@/components/landing/FAQSection').then((m) => ({
    default: m.FAQSection,
  })),
)

// Scroller section ids (DOM anchors) and their common:sections.* label keys,
// in page order.
const SECTION_IDS = [
  'hero',
  'services',
  'why',
  'evidence',
  'values',
  'trust',
  'contact',
  'faq',
]
const SECTION_LABEL_KEYS = [
  'home',
  'services',
  'why',
  'evidence',
  'values',
  'trust',
  'contact',
  'faq',
] as const

// The N1 'pokretanje biznisa' guide (the blog keeps English slugs in every
// locale). Linked from the homepage body so the guide gets an internal link
// with descriptive anchor text.
const STARTUP_GUIDE_PATH =
  '/blog/how-to-start-a-business-in-bih-a-practical-guide-tips-from-experience-with-the-n1-tv-appearance'

export const Route = createFileRoute('/{-$locale}/')({
  head: ({ params }) => ({
    ...localizedPageHead('home', params.locale),
    scripts: [jsonLd(buildWebSiteStructuredData())],
  }),
  component: LandingPage,
})

function LandingPage() {
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const sectionLabels = getSectionLabels(currentLocale, SECTION_LABEL_KEYS)

  return (
    <LandingPageLayout>
      <div className="landing-page relative min-h-screen">
        <SectionScroller labels={sectionLabels} ids={SECTION_IDS}>
          <HeroSection />

          <LandingPanel>
            <Suspense fallback={<LandingSectionFallback />}>
              <ServicesHexGrid />
            </Suspense>
          </LandingPanel>

          <LandingPanel>
            <Suspense fallback={<LandingSectionFallback />}>
              <WhyStartHNSection />
            </Suspense>
          </LandingPanel>

          <LandingPanel>
            <Suspense fallback={<LandingSectionFallback />}>
              <StatsSection />
            </Suspense>
          </LandingPanel>

          <LandingPanel>
            <Suspense fallback={<LandingSectionFallback />}>
              <ValuesSection />
            </Suspense>
          </LandingPanel>

          <LandingPanel>
            <Suspense fallback={<LandingSectionFallback />}>
              <TestimonialsSection />
            </Suspense>
            <Suspense fallback={<LandingSectionFallback />}>
              <ClientLogosSection />
            </Suspense>
          </LandingPanel>

          <LandingPanel>
            <Suspense fallback={<LandingSectionFallback />}>
              <ContactCtaSection />
            </Suspense>
          </LandingPanel>

          <LandingPanel>
            <Suspense fallback={<LandingSectionFallback />}>
              <FAQSection />
            </Suspense>
            <StartupGuideLink locale={currentLocale} />
          </LandingPanel>
        </SectionScroller>
      </div>
    </LandingPageLayout>
  )
}

function LandingPanel({ children }: { children: ReactNode }) {
  return (
    <section className="flex min-h-[calc(100svh-4rem)] flex-col justify-center bg-background [&>section]:!py-8 [&>section]:md:!py-10 [&>section+section]:border-t [&>section+section]:border-border/50">
      {children}
    </section>
  )
}

/**
 * A server-rendered link from the homepage body to the startup guide, placed
 * under the FAQ. Only the title is the anchor text; a stretched ::after
 * makes the whole card clickable.
 */
function StartupGuideLink({ locale }: { locale: string }) {
  const { t } = useTranslation('landing')

  return (
    <div className="border-t border-border/50 bg-muted/30 py-8 md:py-10">
      <div className="container mx-auto max-w-3xl px-6 lg:px-8">
        <div className="group relative flex items-start gap-4 rounded-lg border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <Link
              to={withLocalePath(STARTUP_GUIDE_PATH, locale)}
              className="text-base font-semibold text-foreground after:absolute after:inset-0 after:rounded-lg after:content-[''] group-hover:text-primary focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary"
            >
              {t('guide.linkText')}
            </Link>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t('guide.description')}
            </p>
          </div>
          <ArrowRight
            className="mt-2.5 h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  )
}

function LandingSectionFallback() {
  return <div className="min-h-80 bg-background" />
}
