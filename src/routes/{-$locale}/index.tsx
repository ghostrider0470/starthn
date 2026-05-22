import { createFileRoute, useLocation } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { LandingPageLayout } from '@/components/landing/LandingPageLayout'
import { HeroSection } from '@/components/landing/HeroSection'
import { SectionScroller } from '@/components/landing/SectionScroller'
import { getLocaleFromPath } from '@/lib/i18n-utils'

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

export const Route = createFileRoute('/{-$locale}/')({
  head: () => ({
    meta: [
      { title: 'Start HN — Računovodstvena agencija' },
      {
        name: 'description',
        content:
          'Profesionalne računovodstvene usluge za male i srednje tvrtke. Knjigovodstvo, porezno savjetovanje i financijsko izvještavanje.',
      },
      {
        property: 'og:title',
        content: 'Start HN — Računovodstvena agencija',
      },
      {
        property: 'og:description',
        content:
          'Profesionalne računovodstvene usluge za male i srednje tvrtke. Knjigovodstvo, porezno savjetovanje i financijsko izvještavanje.',
      },
    ],
  }),
  component: LandingPage,
})

function LandingPage() {
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const sectionLabels = currentLocale.startsWith('bs')
    ? [
        'Početna',
        'Usluge',
        'Zašto Start HN',
        'Evidencija',
        'Vrijednosti',
        'Povjerenje',
        'Kontakt',
        'Pitanja',
      ]
    : [
        'Home',
        'Services',
        'Why Start HN',
        'Evidence',
        'Values',
        'Trust',
        'Contact',
        'FAQ',
      ]
  const sectionIds = [
    'hero',
    'services',
    'why',
    'evidence',
    'values',
    'trust',
    'contact',
    'faq',
  ]

  return (
    <LandingPageLayout>
      <div className="landing-page relative min-h-screen">
        <SectionScroller labels={sectionLabels} ids={sectionIds}>
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

function LandingSectionFallback() {
  return <div className="min-h-80 bg-background" />
}
