import { Link, createFileRoute, useLocation } from '@tanstack/react-router'
import { lazy, Suspense, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { HeroSection } from '@/components/landing/HeroSection'
import { LandingPageLayout } from '@/components/landing/LandingPageLayout'

const ServicesHexGrid = lazy(() => import('@/components/landing/ServicesHexGrid').then(m => ({ default: m.ServicesHexGrid })))
const WhyUsSection = lazy(() => import('@/components/landing/WhyUsSection').then(m => ({ default: m.WhyUsSection })))
const GlobalCredibilitySection = lazy(() => import('@/components/landing/GlobalCredibilitySection').then(m => ({ default: m.GlobalCredibilitySection })))
const ContactCTASection = lazy(() => import('@/components/landing/ContactCTASection').then(m => ({ default: m.ContactCTASection })))
const FAQSection = lazy(() => import('@/components/landing/FAQSection').then(m => ({ default: m.FAQSection })))
const BlogPostCard = lazy(() => import('@/components/blog/BlogPostCard').then(m => ({ default: m.BlogPostCard })))

import { PageContainer } from '@/components/layout/PageContainer'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { FadeIn, SlideUp, StaggerContainer, StaggerItem } from '@/components/animations/FadeIn'
import { Button } from '@/components/ui/button'
import { useBlogPosts } from '@/hooks/useBlogQueries'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/{-$locale}/')({
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
      <div className="min-h-screen relative">
        {/* 1. Hero — hook + positioning */}
        <div id="hero" className="scroll-mt-24">
          <FadeIn amount={0.45} duration={designSystem.animation.motion.duration.slow}>
            <HeroSection />
          </FadeIn>
        </div>

        {/* 2. Services — what we do */}
        <Suspense fallback={null}>
          <div id="services" className="scroll-mt-24">
            <SlideUp amount={0.15}>
              <ServicesHexGrid />
            </SlideUp>
          </div>
        </Suspense>

        {/* 3. Why Us — story + differentiators */}
        <Suspense fallback={null}>
          <div id="why-us" className="scroll-mt-24">
            <SlideUp amount={0.15}>
              <WhyUsSection />
            </SlideUp>
          </div>
        </Suspense>

        {/* 4. Stats + Testimonials — social proof */}
        <Suspense fallback={null}>
          <div id="testimonials" className="scroll-mt-24">
            <SlideUp amount={0.15}>
              <GlobalCredibilitySection />
            </SlideUp>
          </div>
        </Suspense>

        {/* 5. Contact CTA — conversion */}
        <Suspense fallback={null}>
          <div id="contact-cta" className="scroll-mt-24">
            <ContactCTASection />
          </div>
        </Suspense>

        {/* 6. FAQ — objection handling */}
        <Suspense fallback={null}>
          <div id="faq" className="scroll-mt-24">
            <FAQSection />
          </div>
        </Suspense>

        {/* 7. Blog — authority */}
        {latestBlogPosts.length > 0 && (
        <Suspense fallback={null}>
          <div id="blog" className="scroll-mt-24 pb-16">
            <PageContainer maxWidth="2xl" spacing="none">
              <SectionContainer
                spacing="xl"
                align="center"
                title={t('homePage.blog.title')}
                description={t('homePage.blog.description')}
              >
                <StaggerContainer
                  className={cn(
                    designSystem.grid.responsive.three,
                    designSystem.spacing.gap.lg,
                  )}
                >
                  {latestBlogPosts.map((post) => (
                    <StaggerItem key={post.slug}>
                      <BlogPostCard post={post} locale={currentLocale} />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
                <div className="mt-8 flex justify-center">
                  <Button asChild variant="outline">
                    <Link to={blogHref}>{t('homePage.blog.cta')}</Link>
                  </Button>
                </div>
              </SectionContainer>
            </PageContainer>
          </div>
        </Suspense>
        )}
      </div>
    </LandingPageLayout>
  )
}
