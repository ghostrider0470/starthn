import { Link, createFileRoute, redirect, useLocation } from '@tanstack/react-router'
import {
  Activity,
  ArrowRight,
  Bot,
  Boxes,
  Database,
  GitBranch,
  ServerCog,
  Workflow,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import { featureFlags } from '@/lib/feature-flags'

export const Route = createFileRoute('/{-$locale}/innovation-lab/ai-systems')({
  beforeLoad: () => {
    if (!featureFlags.technicalResources) throw redirect({ to: '/' as any, replace: true })
  },
  component: AISystemsPage,
})

const pipelineStages = [
  {
    id: 'dataAndFeatureEngineering',
    icon: Database,
  },
  {
    id: 'modelDevelopment',
    icon: Bot,
  },
  {
    id: 'validationAndSafetyGates',
    icon: Activity,
  },
  {
    id: 'operationalFeedbackLoops',
    icon: Workflow,
  },
] as const

const deploymentPatternIds = [
  'realTimeInferenceServices',
  'batchAndStreamingPredictions',
  'edgeAwareDeployment',
] as const

const mlopsCapabilities = [
  {
    id: 'ciCdForModels',
    icon: GitBranch,
  },
  {
    id: 'modelRegistryAndLifecycle',
    icon: Boxes,
  },
  {
    id: 'servingInfrastructure',
    icon: ServerCog,
  },
] as const

const monitoringPillarIds = [
  'predictionQualityAndDriftDetection',
  'latencyThroughputAndCostEfficiencyTracking',
  'dataQualityRegressionAlertsAndRemediationWorkflows',
  'auditabilityForComplianceAndIncidentAnalysis',
] as const

function AISystemsPage() {
  const { t } = useTranslation('innovation-lab')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)

  return (
    <div className={cn('min-h-screen', designSystem.effects.gradient.subtle)}>
      <PageHeader
        variant="hero"
        title={t('aiSystems.hero.title')}
        description={t('aiSystems.hero.description')}
        icon={Bot}
        iconColor="#2563eb"
        showBackButton
        backButtonLabel={t('aiSystems.hero.back')}
        backButtonHref={withLocalePath('/innovation-lab', currentLocale)}
        tags={[
          {
            label: t('aiSystems.hero.tags.appliedAi'),
            color: '#2563eb',
          },
          {
            label: t('aiSystems.hero.tags.mlops'),
            color: '#0ea5e9',
          },
        ]}
      />

      <PageContainer>
        <SectionContainer
          title={t(
            'aiSystems.sections.machineLearningPipelines.title',
          )}
          description={t(
            'aiSystems.sections.machineLearningPipelines.description',
          )}
        >
          <div
            className={cn(
              designSystem.grid.responsive.four,
              designSystem.spacing.gap.md,
            )}
          >
            {pipelineStages.map((stage) => {
              const Icon = stage.icon
              return (
                <Card
                  key={stage.id}
                  className={cn(designSystem.effects.card.base, 'h-full')}
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
                        `aiSystems.pipelineStages.${stage.id}.title`,
                      )}
                    </h3>
                    <p
                      className={cn(
                        designSystem.typography.body.small,
                        designSystem.typography.muted,
                      )}
                    >
                      {t(
                        `aiSystems.pipelineStages.${stage.id}.description`,
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
            'aiSystems.sections.modelDeploymentPatterns.title',
          )}
          description={t(
            'aiSystems.sections.modelDeploymentPatterns.description',
          )}
        >
          <div
            className={cn(
              designSystem.grid.responsive.three,
              designSystem.spacing.gap.md,
            )}
          >
            {deploymentPatternIds.map((patternId) => (
              <Card
                key={patternId}
                className={cn(
                  designSystem.effects.card.base,
                  designSystem.effects.card.hover,
                )}
              >
                <CardHeader>
                  <CardTitle className={cn(designSystem.typography.heading.h5)}>
                    {t(
                      `aiSystems.deploymentPatterns.${patternId}.title`,
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
                      `aiSystems.deploymentPatterns.${patternId}.description`,
                    )}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </SectionContainer>

        <SectionContainer
          title={t(
            'aiSystems.sections.mlopsOperatingModel.title',
          )}
          description={t(
            'aiSystems.sections.mlopsOperatingModel.description',
          )}
        >
          <div
            className={cn(
              designSystem.grid.responsive.three,
              designSystem.spacing.gap.md,
            )}
          >
            {mlopsCapabilities.map((capability) => {
              const Icon = capability.icon
              return (
                <Card
                  key={capability.id}
                  className={cn(designSystem.effects.card.base)}
                >
                  <CardContent
                    className={cn(
                      designSystem.spacing.component.card,
                      'space-y-3',
                    )}
                  >
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className={cn(designSystem.typography.heading.h6)}>
                      {t(
                        `aiSystems.mlopsCapabilities.${capability.id}.title`,
                      )}
                    </h3>
                    <p
                      className={cn(
                        designSystem.typography.body.small,
                        designSystem.typography.muted,
                      )}
                    >
                      {t(
                        `aiSystems.mlopsCapabilities.${capability.id}.description`,
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
            'aiSystems.sections.monitoringAndReliability.title',
          )}
          description={t(
            'aiSystems.sections.monitoringAndReliability.description',
          )}
        >
          <Card
            className={cn(
              designSystem.effects.card.base,
              designSystem.spacing.component.card,
            )}
          >
            <ul className="space-y-3">
              {monitoringPillarIds.map((pillarId) => (
                <li key={pillarId} className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-primary/70" />
                  <span
                    className={cn(
                      designSystem.typography.body.base,
                      designSystem.typography.muted,
                    )}
                  >
                    {t(
                      `aiSystems.monitoringPillars.${pillarId}`,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </SectionContainer>

        <SectionContainer>
          <div
            className={cn(
              'rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-accent/10 p-8 md:p-12',
            )}
          >
            <h2 className={cn(designSystem.typography.heading.h2, 'mb-4')}>
              {t('aiSystems.cta.title')}
            </h2>
            <p
              className={cn(
                designSystem.typography.body.large,
                designSystem.typography.muted,
                'mb-6 max-w-3xl',
              )}
            >
              {t('aiSystems.cta.description')}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link to={withLocalePath('/contact', currentLocale)}>
                  {t('aiSystems.cta.primary')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to={withLocalePath('/innovation-lab', currentLocale)}>
                  {t('aiSystems.cta.secondary')}
                </Link>
              </Button>
            </div>
          </div>
        </SectionContainer>
      </PageContainer>
    </div>
  )
}
