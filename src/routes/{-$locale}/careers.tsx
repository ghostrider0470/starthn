import { createFileRoute, Link, useLocation } from '@tanstack/react-router'
import { Briefcase, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { designSystem } from '@/lib/design-system'
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { cn } from '@/lib/utils'
import { BenefitsSection } from '@/components/landing/BenefitsSection'
import { JobListingsSection } from '@/components/landing/JobListingsSection'
import { TeamCultureSection } from '@/components/landing/TeamCultureSection'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

export const Route = createFileRoute('/{-$locale}/careers')({
  head: () => ({
    meta: [
      { title: 'Careers — Start HN' },
      {
        name: 'description',
        content:
          "Join Start HN. We're building enterprise-grade software, AI, and cloud solutions.",
      },
      { property: 'og:title', content: 'Careers — Start HN' },
      {
        property: 'og:description',
        content:
          "Join Start HN. We're building enterprise-grade software, AI, and cloud solutions.",
      },
    ],
  }),
  component: CareersPage,
})

function CareersPage() {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const stepsRaw = t('careers.process.steps', { returnObjects: true })
  const steps = (typeof stepsRaw === 'string' ? [] : stepsRaw) as {
    title: string
    description: string
  }[]

  return (
    <div className={cn('min-h-screen', designSystem.effects.gradient.subtle)}>
      <PageContainer>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <Badge className="mb-4" variant="secondary">
            <Briefcase className="mr-2 h-3 w-3" />
            {t('careers.badge')}
          </Badge>
          <h1
            className={cn(
              designSystem.typography.heading.h1,
              'mb-6 sm:text-5xl md:text-6xl',
            )}
          >
            {t('careers.hero.titlePrefix')}{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('careers.hero.titleHighlight')}
            </span>
          </h1>
          <p
            className={cn(
              designSystem.typography.body.large,
              designSystem.typography.muted,
              'mb-8 sm:text-xl',
            )}
          >
            {t('careers.hero.description')}
          </p>
          <Button size="lg" asChild>
            <a href="#open-positions">
              {t('careers.hero.button')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </PageContainer>

      <PageContainer>
        <BenefitsSection />
      </PageContainer>

      <TeamCultureSection />

      <div id="open-positions">
        <PageContainer>
          <JobListingsSection />
        </PageContainer>
      </div>

      <PageContainer>
        <SectionContainer spacing="lg">
          <div className="mx-auto max-w-4xl">
            <h2
              className={cn(
                designSystem.typography.heading.h2,
                'mb-6 text-center',
              )}
            >
              {t('careers.process.title')}
            </h2>
            <p
              className={cn(
                designSystem.typography.body.large,
                designSystem.typography.muted,
                'mb-12 text-center',
              )}
            >
              {t('careers.process.description')}
            </p>

            <div className={cn(designSystem.grid.responsive.four, 'gap-6')}>
              {steps.map((step, index) => (
                <div className="text-center" key={step.title}>
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                    {index + 1}
                  </div>
                  <h3
                    className={cn(designSystem.typography.heading.h5, 'mb-2')}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={cn(
                      designSystem.typography.body.small,
                      designSystem.typography.muted,
                    )}
                  >
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SectionContainer>
      </PageContainer>

      <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
        <PageContainer>
          <SectionContainer spacing="lg" className="text-center">
            <h2 className={cn(designSystem.typography.heading.h2, 'mb-4')}>
              {t('careers.cta.title')}
            </h2>
            <p
              className={cn(
                designSystem.typography.body.large,
                designSystem.typography.muted,
                'mx-auto mb-8 max-w-2xl',
              )}
            >
              {t('careers.cta.description')}
            </p>
            <Button size="lg" variant="outline" asChild>
              <Link to={withLocalePath('/contact', currentLocale)}>
                {t('careers.cta.button')}
              </Link>
            </Button>
          </SectionContainer>
        </PageContainer>
      </div>
    </div>
  )
}
