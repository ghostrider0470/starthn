import { Link, createFileRoute, useLocation } from '@tanstack/react-router'
import { lazy, Suspense, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LandingPageLayout } from '@/components/landing/LandingPageLayout'
import { HeroSection } from '@/components/landing/HeroSection'
import { ValuePropsSection } from '@/components/landing/ValuePropsSection'

const BlogPostCard = lazy(() => import('@/components/blog/BlogPostCard').then(m => ({ default: m.BlogPostCard })))
const ServicesHexGrid = lazy(() => import('@/components/landing/ServicesHexGrid').then(m => ({ default: m.ServicesHexGrid })))
const WhyStartHNSection = lazy(() => import('@/components/landing/WhyStartHNSection').then(m => ({ default: m.WhyStartHNSection })))
const StatsSection = lazy(() => import('@/components/landing/StatsSection').then(m => ({ default: m.StatsSection })))
const ValuesSection = lazy(() => import('@/components/landing/ValuesSection').then(m => ({ default: m.ValuesSection })))
const FeatureHighlightsSection = lazy(() => import('@/components/landing/FeatureHighlightsSection').then(m => ({ default: m.FeatureHighlightsSection })))
const TestimonialsSection = lazy(() => import('@/components/landing/TestimonialsSection').then(m => ({ default: m.TestimonialsSection })))
const PromoCardsSection = lazy(() => import('@/components/landing/PromoCardsSection').then(m => ({ default: m.PromoCardsSection })))
const ContactCtaSection = lazy(() => import('@/components/landing/ContactCtaSection').then(m => ({ default: m.ContactCtaSection })))
const ClientLogosSection = lazy(() => import('@/components/landing/ClientLogosSection').then(m => ({ default: m.ClientLogosSection })))
const FAQSection = lazy(() => import('@/components/landing/FAQSection').then(m => ({ default: m.FAQSection })))
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { StaggerContainer, StaggerItem } from '@/components/animations/FadeIn'
import { Button } from '@/components/ui/button'
import { useBlogPosts } from '@/hooks/useBlogQueries'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

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
  const { t } = useTranslation()
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const blogHref = withLocalePath('/blog', currentLocale)

  const { data: blogPosts } = useBlogPosts(currentLocale)
  const latestBlogPosts = useMemo(
    () =>
      [...(blogPosts ?? [])]
        .sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
        )
        .slice(0, 3),
    [blogPosts],
  )

  return (
    <LandingPageLayout>
      <div className="landing-page min-h-screen relative">
        <section id="hero" className="scroll-mt-24">
          <HeroSection />
        </section>

        <section id="value-props" className="scroll-mt-24">
          <ValuePropsSection />
        </section>

        <Suspense fallback={<div className="min-h-[500px]" />}>
          <section id="services" className="scroll-mt-24">
            <ServicesHexGrid />
          </section>
        </Suspense>

        <Suspense fallback={<div className="min-h-[600px]" />}>
          <section id="about" className="scroll-mt-24">
            <WhyStartHNSection />
          </section>
        </Suspense>

        <Suspense fallback={<div className="min-h-[500px]" />}>
          <section id="stats" className="scroll-mt-24">
            <StatsSection />
          </section>
        </Suspense>

        <Suspense fallback={<div className="min-h-[500px]" />}>
          <section id="values" className="scroll-mt-24">
            <ValuesSection />
          </section>
        </Suspense>

        <Suspense fallback={<div className="min-h-[400px]" />}>
          <section id="features" className="scroll-mt-24">
            <FeatureHighlightsSection />
          </section>
        </Suspense>

        <Suspense fallback={<div className="min-h-[500px]" />}>
          <section id="testimonials" className="scroll-mt-24">
            <TestimonialsSection />
          </section>
        </Suspense>

        <Suspense fallback={<div className="min-h-[500px]" />}>
          <section id="promos" className="scroll-mt-24">
            <PromoCardsSection />
          </section>
        </Suspense>

        <Suspense fallback={<div className="min-h-[500px]" />}>
          <section id="contact-cta" className="scroll-mt-24">
            <ContactCtaSection />
          </section>
        </Suspense>

        {latestBlogPosts.length > 0 && (
          <Suspense fallback={<div className="min-h-[400px]" />}>
            <section id="blog" className="scroll-mt-24 bg-muted/30 py-20 md:py-24">
              <PageContainer maxWidth="2xl" spacing="none">
                <SectionContainer
                  spacing="none"
                  align="center"
                  title={t('homePage.blog.title')}
                  description={t('homePage.blog.description')}
                >
                  <StaggerContainer
                    className={cn(
                      designSystem.grid.responsive.three,
                      designSystem.spacing.gap.lg,
                      'mt-12',
                    )}
                  >
                    {latestBlogPosts.map((post) => (
                      <StaggerItem key={post.slug}>
                        <BlogPostCard post={post} locale={currentLocale} />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                  <div className="mt-10 flex justify-center">
                    <Button asChild variant="outline">
                      <Link to={blogHref}>{t('homePage.blog.cta')}</Link>
                    </Button>
                  </div>
                </SectionContainer>
              </PageContainer>
            </section>
          </Suspense>
        )}

        <Suspense fallback={<div className="min-h-[200px]" />}>
          <section id="clients" className="scroll-mt-24">
            <ClientLogosSection />
          </section>
        </Suspense>

        <Suspense fallback={<div className="min-h-[400px]" />}>
          <section id="faq" className="scroll-mt-24">
            <FAQSection />
          </section>
        </Suspense>

      </div>
    </LandingPageLayout>
  )
}
