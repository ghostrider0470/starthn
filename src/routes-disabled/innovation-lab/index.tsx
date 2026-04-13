import { Link, createFileRoute, redirect, useLocation } from '@tanstack/react-router'
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Cpu,
  FileText,
  Globe,
  Network,
  RadioTower,
  Rocket,
  Sparkles,
  Workflow,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { designSystem } from '@/lib/design-system'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import { featureFlags } from '@/lib/feature-flags'

export const Route = createFileRoute('/{-$locale}/innovation-lab/')({
  beforeLoad: () => {
    if (!featureFlags.technicalResources) throw redirect({ to: '/' as any, replace: true })
  },
  component: InnovationLabPage,
})

const heroIcons = [Sparkles, Cpu, Rocket]

type ResearchArea = {
  id:
    | 'appliedAi'
    | 'automationFrameworks'
    | 'advancedArchitecture'
    | 'edgeAndIot'
    | 'nlp'
    | 'evolutionaryAlgorithms'
  icon: typeof Bot
  href: string
}

const researchAreas: Array<ResearchArea> = [
  {
    id: 'appliedAi',
    icon: Bot,
    href: '/innovation-lab/ai-systems',
  },
  {
    id: 'automationFrameworks',
    icon: Workflow,
    href: '#automation-frameworks',
  },
  {
    id: 'advancedArchitecture',
    icon: Network,
    href: '#advanced-architecture',
  },
  {
    id: 'edgeAndIot',
    icon: RadioTower,
    href: '#edge-and-iot',
  },
  {
    id: 'nlp',
    icon: Globe,
    href: '/innovation-lab/nlp',
  },
  {
    id: 'evolutionaryAlgorithms',
    icon: BrainCircuit,
    href: '/innovation-lab/genetic-algorithm',
  },
]

const focusBriefIds = [
  'automationFrameworks',
  'advancedArchitecture',
  'edgeAndIot',
] as const

const productionExampleIds = [
  'adaptiveCapacityPlanning',
  'operationalIntelligence',
  'optimizationInDeliverySystems',
  'edgeDecisioning',
] as const

const roadmapItemIds = [
  'now',
  'next',
  'twelveToEighteenMonths',
  'longHorizon',
] as const

const publications = [
  {
    id: 'aiReliability',
    href: '/blog',
  },
  {
    id: 'distributedArchitecturePatterns',
    href: '/case-studies',
  },
  {
    id: 'roadmappingAppliedRd',
    href: '/blog',
  },
] as const

function InnovationLabPage() {
  const { t } = useTranslation('innovation-lab')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)

  return (
    <div className={cn('min-h-screen', designSystem.effects.gradient.subtle)}>
      <PageHeader
        variant="hero"
        align="center"
        heroSize="large"
        title={t('overview.hero.title')}
        description={t('overview.hero.description')}
        icons={heroIcons}
        actionButtons={
          <>
            <Button size="lg" asChild>
              <a href="#research-areas">
                {t('overview.hero.primary')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to={withLocalePath('/contact', currentLocale)}>
                {t('overview.hero.secondary')}
              </Link>
            </Button>
          </>
        }
      />

      <PageContainer>
        <SectionContainer
          title={t('overview.sections.researchAreas.title')}
          description={t(
            'overview.sections.researchAreas.description',
          )}
          className="scroll-mt-24"
        >
          <div id="research-areas" />
          <div
            className={cn(
              designSystem.grid.responsive.three,
              designSystem.spacing.gap.lg,
            )}
          >
            {researchAreas.map((area) => {
              const Icon = area.icon
              const isRoute = area.href.startsWith('/')
              const cardContent = (
                <Card
                  className={cn(
                    designSystem.effects.card.base,
                    designSystem.effects.card.interactive,
                    'h-full border-muted/60',
                  )}
                >
                  <CardHeader>
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle
                      className={cn(designSystem.typography.heading.h5)}
                    >
                      {t(
                        `overview.researchAreas.${area.id}.title`,
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p
                      className={cn(
                        designSystem.typography.body.base,
                        designSystem.typography.muted,
                      )}
                    >
                      {t(
                        `overview.researchAreas.${area.id}.description`,
                      )}
                    </p>
                    <div className="flex items-center text-sm font-medium text-primary">
                      {t(
                        'overview.sections.researchAreas.cardCta',
                      )}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              )

              if (isRoute) {
                return (
                  <Link
                    key={area.id}
                    to={withLocalePath(area.href, currentLocale)}
                    className="h-full"
                  >
                    {cardContent}
                  </Link>
                )
              }

              return (
                <a key={area.id} href={area.href} className="h-full">
                  {cardContent}
                </a>
              )
            })}
          </div>
        </SectionContainer>

        <SectionContainer
          title={t(
            'overview.sections.detailedFocusBriefs.title',
          )}
          description={t(
            'overview.sections.detailedFocusBriefs.description',
          )}
        >
          <div
            className={cn(
              designSystem.grid.responsive.three,
              designSystem.spacing.gap.md,
            )}
          >
            {focusBriefIds.map((focusId) => (
              <Card
                key={focusId}
                id={
                  focusId === 'automationFrameworks'
                    ? 'automation-frameworks'
                    : focusId === 'advancedArchitecture'
                      ? 'advanced-architecture'
                      : 'edge-and-iot'
                }
                className={cn(
                  designSystem.effects.card.base,
                  designSystem.spacing.component.card,
                )}
              >
                <h3 className={cn(designSystem.typography.heading.h5, 'mb-3')}>
                  {t(
                    `overview.detailedFocusBriefs.${focusId}.title`,
                  )}
                </h3>
                <p
                  className={cn(
                    designSystem.typography.body.base,
                    designSystem.typography.muted,
                  )}
                >
                  {t(
                    `overview.detailedFocusBriefs.${focusId}.description`,
                  )}
                </p>
              </Card>
            ))}
          </div>
        </SectionContainer>

        <SectionContainer
          title={t(
            'overview.sections.fromLabToProduction.title',
          )}
          description={t(
            'overview.sections.fromLabToProduction.description',
          )}
        >
          <div
            className={cn(
              designSystem.grid.responsive.two,
              designSystem.spacing.gap.lg,
            )}
          >
            {productionExampleIds.map((exampleId) => (
              <Card
                key={exampleId}
                className={cn(
                  designSystem.effects.card.base,
                  designSystem.effects.card.hover,
                )}
              >
                <CardHeader>
                  <CardTitle className={cn(designSystem.typography.heading.h5)}>
                    {t(
                      `overview.productionExamples.${exampleId}.title`,
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
                      `overview.productionExamples.${exampleId}.description`,
                    )}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </SectionContainer>

        <SectionContainer
          title={t('overview.sections.roadmap.title')}
          description={t(
            'overview.sections.roadmap.description',
          )}
        >
          <div className="space-y-4">
            {roadmapItemIds.map((roadmapId) => (
              <Card
                key={roadmapId}
                className={cn(designSystem.effects.card.base)}
              >
                <CardContent
                  className={cn(
                    designSystem.spacing.component.card,
                    'grid gap-4 md:grid-cols-[180px_1fr] md:items-start',
                  )}
                >
                  <div className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {t(
                      `overview.roadmap.${roadmapId}.phase`,
                    )}
                  </div>
                  <div>
                    <h3
                      className={cn(designSystem.typography.heading.h5, 'mb-2')}
                    >
                      {t(
                        `overview.roadmap.${roadmapId}.title`,
                      )}
                    </h3>
                    <p
                      className={cn(
                        designSystem.typography.body.base,
                        designSystem.typography.muted,
                      )}
                    >
                      {t(
                        `overview.roadmap.${roadmapId}.description`,
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </SectionContainer>

        <SectionContainer
          title={t('overview.sections.publications.title')}
          description={t(
            'overview.sections.publications.description',
          )}
        >
          <div
            className={cn(
              designSystem.grid.responsive.three,
              designSystem.spacing.gap.lg,
            )}
          >
            {publications.map((publication) => (
              <Card
                key={publication.id}
                className={cn(designSystem.effects.card.base, 'h-full')}
              >
                <CardHeader className="space-y-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className={cn(designSystem.typography.heading.h5)}>
                    {t(
                      `overview.publications.${publication.id}.title`,
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p
                    className={cn(
                      designSystem.typography.body.base,
                      designSystem.typography.muted,
                    )}
                  >
                    {t(
                      `overview.publications.${publication.id}.summary`,
                    )}
                  </p>
                  <Button variant="ghost" className="px-0" asChild>
                    <Link to={withLocalePath(publication.href, currentLocale)}>
                      {t(
                        `overview.publications.${publication.id}.cta`,
                      )}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </SectionContainer>

        <SectionContainer>
          <div
            className={cn(
              'rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-accent/10 p-8 md:p-12',
            )}
          >
            <h2 className={cn(designSystem.typography.heading.h2, 'mb-4')}>
              {t('overview.cta.title')}
            </h2>
            <p
              className={cn(
                designSystem.typography.body.large,
                designSystem.typography.muted,
                'mb-6 max-w-3xl',
              )}
            >
              {t('overview.cta.description')}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link to={withLocalePath('/contact', currentLocale)}>
                  {t('overview.cta.primary')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to={withLocalePath('/case-studies', currentLocale)}>
                  {t('overview.cta.secondary')}
                </Link>
              </Button>
            </div>
          </div>
        </SectionContainer>
      </PageContainer>
    </div>
  )
}
