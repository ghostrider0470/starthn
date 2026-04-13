import { useTranslation } from 'react-i18next'
import { ResultsMetrics } from './ResultsMetrics'
import { TechStackGrid } from './TechStackGrid'
import type { CaseStudy } from '@/components/landing/CaseStudyCard'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { Badge } from '@/components/ui/badge'
import { StandardCard } from '@/components/ui/standard-card'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface CaseStudyDetailProps {
  caseStudy: CaseStudy
  backHref: string
}

export function CaseStudyDetail({ caseStudy, backHref }: CaseStudyDetailProps) {
  const { t } = useTranslation('pages')

  return (
    <div className={cn('min-h-screen', designSystem.effects.gradient.subtle)}>
      <PageHeader
        variant="hero"
        heroSize="default"
        title={caseStudy.title}
        description={caseStudy.description}
        showBackButton
        backButtonLabel={t('caseStudyDetail.back')}
        backButtonHref={backHref}
        tags={[
          { label: t(`caseStudyCard.industries.${caseStudy.industry}`) },
          ...caseStudy.tags.slice(0, 3).map((tag) => ({ label: tag })),
        ]}
      />

      <PageContainer maxWidth="2xl" className="pt-0">
        <SectionContainer
          title={t('caseStudyDetail.sections.executiveSummary')}
          spacing="lg"
        >
          <StandardCard className="border-primary/20">
            <div
              className={cn(
                designSystem.grid.responsive.two,
                designSystem.spacing.gap.lg,
              )}
            >
              <div>
                <Badge variant="secondary" className="mb-3">
                  {t(`caseStudyCard.industries.${caseStudy.industry}`)}
                </Badge>
                <p className={cn(designSystem.typography.body.base, 'mb-3')}>
                  {caseStudy.executiveSummary}
                </p>
                <p
                  className={cn(
                    designSystem.typography.body.small,
                    designSystem.typography.muted,
                  )}
                >
                  {t('caseStudyDetail.client')}: {caseStudy.client}
                </p>
              </div>

              <div>
                <p
                  className={cn(
                    designSystem.typography.body.small,
                    designSystem.typography.muted,
                    'mb-3 font-medium uppercase tracking-wide',
                  )}
                >
                  {t('caseStudyDetail.keyOutcomes')}
                </p>
                <div className={cn('space-y-3')}>
                  {caseStudy.results.slice(0, 2).map((result) => (
                    <div
                      key={`summary-${result.metric}`}
                      className="rounded-lg border bg-card p-3"
                    >
                      <p
                        className={cn(
                          designSystem.typography.heading.h5,
                          'text-primary',
                        )}
                      >
                        {result.value}
                      </p>
                      <p className={cn(designSystem.typography.body.small)}>
                        {result.metric}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </StandardCard>
        </SectionContainer>

        <SectionContainer
          title={t('caseStudyDetail.sections.businessChallenge')}
          spacing="lg"
        >
          <StandardCard>
            <p className={cn(designSystem.typography.body.base)}>
              {caseStudy.challenge}
            </p>
          </StandardCard>
        </SectionContainer>

        <SectionContainer
          title={t('caseStudyDetail.sections.technicalSolution')}
          spacing="lg"
        >
          <StandardCard>
            <p className={cn(designSystem.typography.body.base)}>
              {caseStudy.solution}
            </p>
          </StandardCard>
        </SectionContainer>

        <SectionContainer
          title={t('caseStudyDetail.sections.architectureDecisions')}
          spacing="lg"
        >
          <div
            className={cn(
              designSystem.grid.responsive.three,
              designSystem.spacing.gap.lg,
            )}
          >
            {caseStudy.architectureDecisions.map((item, index) => (
              <StandardCard
                key={item.decision}
                className="h-full border-muted/60"
              >
                <p
                  className={cn(
                    designSystem.typography.body.small,
                    designSystem.typography.muted,
                    'mb-2 font-medium',
                  )}
                >
                  {t('caseStudyDetail.decision', {
                    number: index + 1,
                  })}
                </p>
                <h3 className={cn(designSystem.typography.heading.h5, 'mb-3')}>
                  {item.decision}
                </h3>
                <p
                  className={cn(
                    designSystem.typography.body.small,
                    designSystem.typography.muted,
                  )}
                >
                  {item.rationale}
                </p>
              </StandardCard>
            ))}
          </div>
        </SectionContainer>

        <SectionContainer
          title={t('caseStudyDetail.sections.technologyStack')}
          spacing="lg"
        >
          <TechStackGrid techStack={caseStudy.techStack} />
        </SectionContainer>

        <SectionContainer
          title={t('caseStudyDetail.sections.resultsImpact')}
          spacing="lg"
        >
          <ResultsMetrics results={caseStudy.results} />
        </SectionContainer>
      </PageContainer>
    </div>
  )
}
