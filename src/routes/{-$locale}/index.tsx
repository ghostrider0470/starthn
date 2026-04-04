import { Link, createFileRoute, useLocation } from '@tanstack/react-router'
import { lazy, Suspense, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { HeroSection } from '@/components/landing/HeroSection'
import { LandingPageLayout } from '@/components/landing/LandingPageLayout'

const BlogPostCard = lazy(() => import('@/components/blog/BlogPostCard').then(m => ({ default: m.BlogPostCard })))
const CaseStudyGrid = lazy(() => import('@/components/landing/CaseStudyGrid').then(m => ({ default: m.CaseStudyGrid })))
const ServicesHexGrid = lazy(() => import('@/components/landing/ServicesHexGrid').then(m => ({ default: m.ServicesHexGrid })))
const GlobalCredibilitySection = lazy(() => import('@/components/landing/GlobalCredibilitySection').then(m => ({ default: m.GlobalCredibilitySection })))
const PartnerBadges = lazy(() => import('@/components/landing/PartnerBadges').then(m => ({ default: m.PartnerBadges })))
const FAQSection = lazy(() => import('@/components/landing/FAQSection').then(m => ({ default: m.FAQSection })))
const ChatSection = lazy(() => import('@/components/landing/ChatSection').then(m => ({ default: m.ChatSection })))
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { FadeIn, SlideUp, StaggerContainer, StaggerItem } from '@/components/animations/FadeIn'
import { StandardCard } from '@/components/ui/standard-card'
import { Button } from '@/components/ui/button'
import { caseStudies } from '@/data/case-studies'
import { useBlogPosts } from '@/hooks/useBlogQueries'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import { featureFlags } from '@/lib/feature-flags'

export const Route = createFileRoute('/{-$locale}/')({
  component: LandingPage,
})

function LandingPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const caseStudiesHref = withLocalePath('/case-studies', currentLocale)
  const blogHref = withLocalePath('/blog', currentLocale)
  const innovationLabHref = withLocalePath('/innovation-lab', currentLocale)

  const featuredCaseStudies = useMemo(() => caseStudies.slice(0, 3), [])
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
        {/* All sections with proper IDs for scroll tracking */}
        <div id="hero" className="landing-section landing-section--hero scroll-mt-24">
          <FadeIn
            amount={0.45}
            duration={designSystem.animation.motion.duration.slow}
          >
            <HeroSection />
          </FadeIn>
        </div>
        <Suspense fallback={null}>
        <div id="solutions" className="landing-section landing-section--alt-b scroll-mt-24">
          <SlideUp amount={0.15}>
            <ServicesHexGrid />
          </SlideUp>
        </div>
        </Suspense>
        <Suspense fallback={null}>
        <div id="credibility" className="landing-section landing-section--alt-a scroll-mt-24">
          <SlideUp amount={0.15}>
            <GlobalCredibilitySection />
          </SlideUp>
        </div>
        </Suspense>
        <Suspense fallback={null}>
        <div id="partners" className="landing-section landing-section--alt-b scroll-mt-24">
          <SlideUp amount={0.15}>
            <PartnerBadges />
          </SlideUp>
        </div>
        </Suspense>
        {featureFlags.caseStudies && (
        <Suspense fallback={null}>
        <div id="case-studies" className="landing-section landing-section--alt-a scroll-mt-24">
          <PageContainer maxWidth="2xl" spacing="none">
            <SectionContainer
              spacing="xl"
              align="center"
              title={t('homePage.caseStudies.title')}
              description={t('homePage.caseStudies.description')}
            >
              <CaseStudyGrid caseStudies={featuredCaseStudies} />
              <div className="mt-8 flex justify-center">
                <Button asChild>
                  <Link to={caseStudiesHref}>{t('homePage.caseStudies.cta')}</Link>
                </Button>
              </div>
            </SectionContainer>
          </PageContainer>
        </div>
        </Suspense>
        )}
        <Suspense fallback={null}>
        <div id="blog" className="landing-section landing-section--alt-b scroll-mt-24">
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
        {featureFlags.innovationLab && (
        <Suspense fallback={null}>
        <div id="innovation-lab" className="landing-section landing-section--alt-a scroll-mt-24">
          <PageContainer maxWidth="2xl" spacing="none">
            <SectionContainer spacing="lg">
              <StandardCard variant="gradient" className="text-center">
                <h2 className={cn(designSystem.typography.heading.h2, 'mb-3')}>
                  {t('homePage.innovationLab.title')}
                </h2>
                <p
                  className={cn(
                    designSystem.typography.body.large,
                    designSystem.typography.muted,
                    'mx-auto mb-6 max-w-3xl',
                  )}
                >
                  {t('homePage.innovationLab.description')}
                </p>
                <Button asChild size="lg">
                  <Link to={innovationLabHref}>
                    {t('homePage.innovationLab.cta')}
                  </Link>
                </Button>
              </StandardCard>
            </SectionContainer>
          </PageContainer>
        </div>
        </Suspense>
        )}
        <Suspense fallback={null}>
        <div id="faq" className="landing-section landing-section--alt-a scroll-mt-24">
          <SlideUp amount={0.15}>
            <FAQSection />
          </SlideUp>
        </div>
        </Suspense>
        {featureFlags.chat && (
        <Suspense fallback={null}>
        <div id="chat" className="landing-section landing-section--alt-b scroll-mt-24">
          <ChatSection />
        </div>
        </Suspense>
        )}
      </div>
    </LandingPageLayout>
  )
}
