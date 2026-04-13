import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Award, Target, TrendingUp, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CaseStudyIndustry } from '@/services/case-study.service'
import { CaseStudyGrid } from '@/components/landing/CaseStudyGrid'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { Button } from '@/components/ui/button'
import { StandardCard } from '@/components/ui/standard-card'
import { caseStudies, caseStudyIndustries } from '@/data/case-studies'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { featureFlags } from '@/lib/feature-flags'

export const Route = createFileRoute('/{-$locale}/case-studies/')({
  head: () => ({
    meta: [
      { title: 'Case Studies — Horizon Tech' },
      {
        name: 'description',
        content:
          'Real-world enterprise software, AI, and cloud architecture projects by Horizon Tech.',
      },
      { property: 'og:title', content: 'Case Studies — Horizon Tech' },
      {
        property: 'og:description',
        content:
          'Real-world enterprise software, AI, and cloud architecture projects by Horizon Tech.',
      },
    ],
  }),
  beforeLoad: () => {
    if (!featureFlags.caseStudies) throw redirect({ to: '/' as any, replace: true })
  },
  component: CaseStudiesPage,
})

type IndustryFilter = 'all' | CaseStudyIndustry

function CaseStudiesPage() {
  const { t } = useTranslation('pages')
  const [activeIndustry, setActiveIndustry] = useState<IndustryFilter>('all')

  const filteredCaseStudies = useMemo(() => {
    if (activeIndustry === 'all') {
      return caseStudies
    }

    return caseStudies.filter(
      (caseStudy) => caseStudy.industry === activeIndustry,
    )
  }, [activeIndustry])

  const stats = [
    {
      icon: Award,
      value: `${caseStudies.length}`,
      label: t('caseStudies.stats.projects'),
    },
    {
      icon: Users,
      value: '5',
      label: t('caseStudies.stats.clients'),
    },
    {
      icon: TrendingUp,
      value: '18%',
      label: t('caseStudies.stats.efficiency'),
    },
    {
      icon: Target,
      value: '99.95%',
      label: t('caseStudies.stats.retention'),
    },
  ]

  return (
    <div className={cn('min-h-screen', designSystem.effects.gradient.subtle)}>
      <PageHeader
        variant="hero"
        align="center"
        heroSize="large"
        title={`${t('caseStudies.hero.titlePrefix')} ${t('caseStudies.hero.titleHighlight')}`}
        description={t('caseStudies.hero.description')}
        tags={[
          { label: t('caseStudies.badge') },
          { label: t('caseStudies.hero.tags.delivery') },
          { label: t('caseStudies.hero.tags.outcomes') },
        ]}
      />

      <PageContainer className="pt-0">
        <SectionContainer spacing="lg">
          <div
            className={cn(
              designSystem.grid.responsive.four,
              designSystem.spacing.gap.lg,
            )}
          >
            {stats.map((stat) => {
              const Icon = stat.icon

              return (
                <StandardCard
                  key={stat.label}
                  variant="hover"
                  className="h-full text-center"
                >
                  <Icon className="mx-auto mb-4 h-10 w-10 text-primary" />
                  <p
                    className={cn(
                      designSystem.typography.heading.h2,
                      'mb-2 text-primary',
                    )}
                  >
                    {stat.value}
                  </p>
                  <p
                    className={cn(
                      designSystem.typography.body.small,
                      designSystem.typography.muted,
                    )}
                  >
                    {stat.label}
                  </p>
                </StandardCard>
              )
            })}
          </div>
        </SectionContainer>

        <SectionContainer
          title={t('caseStudies.filters.title')}
          spacing="md"
        >
          <div className={cn('flex flex-wrap', designSystem.spacing.gap.sm)}>
            <Button
              variant={activeIndustry === 'all' ? 'default' : 'outline'}
              onClick={() => setActiveIndustry('all')}
            >
              {t('caseStudies.filters.all')}
            </Button>
            {caseStudyIndustries.map((industry) => (
              <Button
                key={industry}
                variant={activeIndustry === industry ? 'default' : 'outline'}
                onClick={() => setActiveIndustry(industry)}
              >
                {t(`caseStudyCard.industries.${industry}`)}
              </Button>
            ))}
          </div>
        </SectionContainer>

        <SectionContainer spacing="lg">
          {filteredCaseStudies.length > 0 ? (
            <CaseStudyGrid caseStudies={filteredCaseStudies} />
          ) : (
            <StandardCard className="text-center">
              <p
                className={cn(
                  designSystem.typography.body.base,
                  designSystem.typography.muted,
                )}
              >
                {t('caseStudies.filters.empty')}
              </p>
            </StandardCard>
          )}
        </SectionContainer>

        <SectionContainer spacing="lg" className="text-center">
          <div
            className={cn(
              'rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-12',
            )}
          >
            <h2 className={cn(designSystem.typography.heading.h2, 'mb-4')}>
              {t('caseStudies.cta.title')}
            </h2>
            <p
              className={cn(
                designSystem.typography.body.large,
                designSystem.typography.muted,
                'mx-auto max-w-3xl',
              )}
            >
              {t('caseStudies.cta.description')}
            </p>
          </div>
        </SectionContainer>
      </PageContainer>
    </div>
  )
}
