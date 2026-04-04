import { createFileRoute, redirect, useLocation } from '@tanstack/react-router'
import {
  BarChart3,
  Globe,
  Heart,
  Languages,
  MessageSquare,
  ScanText,
  Shield,
  Tag,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { NLPDemo } from '@/components/innovation-lab/NLPDemo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import { featureFlags } from '@/lib/feature-flags'

export const Route = createFileRoute('/{-$locale}/innovation-lab/nlp')({
  beforeLoad: () => {
    if (!featureFlags.technicalResources) throw redirect({ to: '/' as any, replace: true })
  },
  component: NLPPage,
})

const capabilities = [
  {
    id: 'languageDetection',
    icon: Globe,
  },
  {
    id: 'sentimentAnalysis',
    icon: Heart,
  },
  {
    id: 'entityExtraction',
    icon: Tag,
  },
  {
    id: 'translation',
    icon: Languages,
  },
] as const

const productionApplications = [
  {
    id: 'supportAndTicketIntelligence',
    icon: MessageSquare,
  },
  {
    id: 'governedContentOperations',
    icon: Shield,
  },
  {
    id: 'textDrivenBusinessInsights',
    icon: BarChart3,
  },
] as const

const operatingPrincipleIds = [
  'evaluationByUseCase',
  'humanInTheLoopSafeguards',
  'continuousMonitoring',
] as const

function NLPPage() {
  const { t } = useTranslation('innovation-lab')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="hero"
        title={t('nlp.hero.title')}
        description={t('nlp.hero.description')}
        icon={Globe}
        iconColor="#ec4899"
        showBackButton
        backButtonLabel={t('nlp.hero.back')}
        backButtonHref={withLocalePath('/innovation-lab', currentLocale)}
        tags={[
          {
            label: t('nlp.hero.tags.demo'),
            color: '#10b981',
          },
          {
            label: t('nlp.hero.tags.intelligence'),
            color: '#3b82f6',
          },
        ]}
      />

      <PageContainer>
        <SectionContainer
          title={t('nlp.sections.foundations.title')}
          description={t(
            'nlp.sections.foundations.description',
          )}
        >
          <div
            className={cn(
              designSystem.grid.responsive.two,
              designSystem.spacing.gap.lg,
            )}
          >
            <Card
              className={cn(
                designSystem.effects.card.base,
                designSystem.spacing.component.card,
              )}
            >
              <p
                className={cn(
                  designSystem.typography.body.base,
                  designSystem.typography.muted,
                  'mb-4',
                )}
              >
                {t('nlp.foundations.intro1')}
              </p>
              <p
                className={cn(
                  designSystem.typography.body.base,
                  designSystem.typography.muted,
                )}
              >
                {t('nlp.foundations.intro2')}
              </p>
            </Card>
            <div
              className={cn(
                designSystem.grid.responsive.two,
                designSystem.spacing.gap.md,
              )}
            >
              {capabilities.map((capability) => {
                const Icon = capability.icon
                return (
                  <Card
                    key={capability.id}
                    className={cn(designSystem.effects.card.base)}
                  >
                    <CardContent
                      className={cn(
                        designSystem.spacing.component.cardCompact,
                        'space-y-3',
                      )}
                    >
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className={cn(designSystem.typography.heading.h6)}>
                        {t(
                          `nlp.capabilities.${capability.id}.title`,
                        )}
                      </h3>
                      <p
                        className={cn(
                          designSystem.typography.body.small,
                          designSystem.typography.muted,
                        )}
                      >
                        {t(
                          `nlp.capabilities.${capability.id}.description`,
                        )}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </SectionContainer>

        <SectionContainer
          title={t('nlp.sections.workbench.title')}
          description={t(
            'nlp.sections.workbench.description',
          )}
        >
          <Card
            className={cn(
              designSystem.effects.card.base,
              'overflow-hidden border-muted/60',
            )}
          >
            <CardContent
              className={cn(
                designSystem.spacing.component.cardCompact,
                'md:p-6',
              )}
            >
              <NLPDemo />
            </CardContent>
          </Card>
        </SectionContainer>

        <SectionContainer
          title={t(
            'nlp.sections.productionApplications.title',
          )}
          description={t(
            'nlp.sections.productionApplications.description',
          )}
        >
          <div
            className={cn(
              designSystem.grid.responsive.three,
              designSystem.spacing.gap.md,
            )}
          >
            {productionApplications.map((application) => {
              const Icon = application.icon
              return (
                <Card
                  key={application.id}
                  className={cn(
                    designSystem.effects.card.base,
                    designSystem.effects.card.hover,
                  )}
                >
                  <CardHeader className="space-y-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle
                      className={cn(designSystem.typography.heading.h5)}
                    >
                      {t(
                        `nlp.productionApplications.${application.id}.title`,
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p
                      className={cn(
                        designSystem.typography.body.base,
                        designSystem.typography.muted,
                      )}
                    >
                      {t(
                        `nlp.productionApplications.${application.id}.description`,
                      )}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </SectionContainer>

        <SectionContainer
          title={t(
            'nlp.sections.reliabilityAndGovernance.title',
          )}
          description={t(
            'nlp.sections.reliabilityAndGovernance.description',
          )}
        >
          <div
            className={cn(
              designSystem.grid.responsive.three,
              designSystem.spacing.gap.md,
            )}
          >
            {operatingPrincipleIds.map((principleId) => (
              <Card
                key={principleId}
                className={cn(designSystem.effects.card.base)}
              >
                <CardContent
                  className={cn(
                    designSystem.spacing.component.card,
                    'space-y-3',
                  )}
                >
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15">
                    <ScanText className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <h3 className={cn(designSystem.typography.heading.h6)}>
                    {t(
                      `nlp.operatingPrinciples.${principleId}.title`,
                    )}
                  </h3>
                  <p
                    className={cn(
                      designSystem.typography.body.small,
                      designSystem.typography.muted,
                    )}
                  >
                    {t(
                      `nlp.operatingPrinciples.${principleId}.description`,
                    )}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </SectionContainer>
      </PageContainer>
    </div>
  )
}
