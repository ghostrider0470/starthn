import { createFileRoute, redirect, useLocation } from '@tanstack/react-router'
import {
  ArrowUpRight,
  Brain,
  Dna,
  Gauge,
  Search,
  Shuffle,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { CamouflageEvolution } from '@/components/innovation-lab/CamouflageEvolution'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import { featureFlags } from '@/lib/feature-flags'

export const Route = createFileRoute(
  '/{-$locale}/innovation-lab/genetic-algorithm',
)({
  beforeLoad: () => {
    if (!featureFlags.technicalResources) throw redirect({ to: '/' as any, replace: true })
  },
  component: GeneticAlgorithmPage,
})

const mechanics = [
  {
    id: 'selection',
    icon: TrendingUp,
  },
  {
    id: 'crossover',
    icon: Shuffle,
  },
  {
    id: 'mutation',
    icon: Zap,
  },
  {
    id: 'convergence',
    icon: Brain,
  },
] as const

const productionUses = [
  {
    id: 'resourceScheduling',
    icon: Gauge,
  },
  {
    id: 'architectureTuning',
    icon: Search,
  },
  {
    id: 'continuousOptimization',
    icon: ArrowUpRight,
  },
] as const

const realWorldApplicationIds = [
  'routeAndLogisticsPlanning',
  'modelAndHyperparameterSearch',
  'portfolioAndAllocationProblems',
] as const

function GeneticAlgorithmPage() {
  const { t } = useTranslation('innovation-lab')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="hero"
        title={t('geneticAlgorithm.hero.title')}
        description={t('geneticAlgorithm.hero.description')}
        icon={Dna}
        iconColor="#10b981"
        showBackButton
        backButtonLabel={t('geneticAlgorithm.hero.back')}
        backButtonHref={withLocalePath('/innovation-lab', currentLocale)}
        tags={[
          {
            label: t('geneticAlgorithm.hero.tags.demo'),
            color: '#10b981',
          },
          {
            label: t(
              'geneticAlgorithm.hero.tags.optimizationScience',
            ),
            color: '#3b82f6',
          },
        ]}
      />

      <PageContainer>
        <SectionContainer
          title={t(
            'geneticAlgorithm.sections.scientificFoundation.title',
          )}
          description={t(
            'geneticAlgorithm.sections.scientificFoundation.description',
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
                {t(
                  'geneticAlgorithm.scientificFoundation.intro1',
                )}
              </p>
              <p
                className={cn(
                  designSystem.typography.body.base,
                  designSystem.typography.muted,
                )}
              >
                {t(
                  'geneticAlgorithm.scientificFoundation.intro2',
                )}
              </p>
            </Card>
            <div
              className={cn(
                designSystem.grid.responsive.two,
                designSystem.spacing.gap.md,
              )}
            >
              {mechanics.map((item) => {
                const Icon = item.icon
                return (
                  <Card
                    key={item.id}
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
                          `geneticAlgorithm.mechanics.${item.id}.title`,
                        )}
                      </h3>
                      <p
                        className={cn(
                          designSystem.typography.body.small,
                          designSystem.typography.muted,
                        )}
                      >
                        {t(
                          `geneticAlgorithm.mechanics.${item.id}.description`,
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
          title={t(
            'geneticAlgorithm.sections.interactiveEnvironment.title',
          )}
          description={t(
            'geneticAlgorithm.sections.interactiveEnvironment.description',
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
              <CamouflageEvolution />
            </CardContent>
          </Card>
        </SectionContainer>

        <SectionContainer
          title={t(
            'geneticAlgorithm.sections.productionUse.title',
          )}
          description={t(
            'geneticAlgorithm.sections.productionUse.description',
          )}
        >
          <div
            className={cn(
              designSystem.grid.responsive.three,
              designSystem.spacing.gap.md,
            )}
          >
            {productionUses.map((useCase) => {
              const Icon = useCase.icon
              return (
                <Card
                  key={useCase.id}
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
                        `geneticAlgorithm.productionUses.${useCase.id}.title`,
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
                        `geneticAlgorithm.productionUses.${useCase.id}.description`,
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
            'geneticAlgorithm.sections.applicationDomains.title',
          )}
          description={t(
            'geneticAlgorithm.sections.applicationDomains.description',
          )}
        >
          <div
            className={cn(
              designSystem.grid.responsive.three,
              designSystem.spacing.gap.md,
            )}
          >
            {realWorldApplicationIds.map((applicationId) => (
              <Card
                key={applicationId}
                className={cn(designSystem.effects.card.base)}
              >
                <CardContent
                  className={cn(
                    designSystem.spacing.component.card,
                    'space-y-2',
                  )}
                >
                  <h3 className={cn(designSystem.typography.heading.h6)}>
                    {t(
                      `geneticAlgorithm.realWorldApplications.${applicationId}.title`,
                    )}
                  </h3>
                  <p
                    className={cn(
                      designSystem.typography.body.small,
                      designSystem.typography.muted,
                    )}
                  >
                    {t(
                      `geneticAlgorithm.realWorldApplications.${applicationId}.description`,
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
