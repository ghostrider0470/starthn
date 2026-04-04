import { Link, createFileRoute, useLocation } from '@tanstack/react-router'
import { lazy, Suspense, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { HeroSection } from '@/components/landing/HeroSection'
import { LandingPageLayout } from '@/components/landing/LandingPageLayout'

const BlogPostCard = lazy(() => import('@/components/blog/BlogPostCard').then(m => ({ default: m.BlogPostCard })))
const ServicesHexGrid = lazy(() => import('@/components/landing/ServicesHexGrid').then(m => ({ default: m.ServicesHexGrid })))
const GlobalCredibilitySection = lazy(() => import('@/components/landing/GlobalCredibilitySection').then(m => ({ default: m.GlobalCredibilitySection })))
const CoreValuesSection = lazy(() => import('@/components/landing/CoreValuesSection').then(m => ({ default: m.CoreValuesSection })))
const FAQSection = lazy(() => import('@/components/landing/FAQSection').then(m => ({ default: m.FAQSection })))
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
      <div className="landing-page min-h-screen relative">
        <div id="hero" className="scroll-mt-24">
          <FadeIn amount={0.45} duration={designSystem.animation.motion.duration.slow}>
            <HeroSection />
          </FadeIn>
        </div>

        <Suspense fallback={null}>
          <div id="solutions" className="scroll-mt-24">
            <SlideUp amount={0.15}>
              <ServicesHexGrid />
            </SlideUp>
          </div>
        </Suspense>

        <Suspense fallback={null}>
          <div id="credibility" className="scroll-mt-24">
            <SlideUp amount={0.15}>
              <GlobalCredibilitySection />
            </SlideUp>
          </div>
        </Suspense>

        <Suspense fallback={null}>
          <div id="values" className="scroll-mt-24">
            <SlideUp amount={0.15}>
              <CoreValuesSection />
            </SlideUp>
          </div>
        </Suspense>

        <Suspense fallback={null}>
          <div id="blog" className="scroll-mt-24">
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

        <Suspense fallback={null}>
          <div id="faq" className="scroll-mt-24">
            <SlideUp amount={0.15}>
              <FAQSection />
            </SlideUp>
          </div>
        </Suspense>
      </div>
    </LandingPageLayout>
  )
}
