import type { LucideIcon } from 'lucide-react'
import type { IconType } from 'react-icons'
import {
  ArrowRight,
  CheckCircle2,
  CircleGauge,
  Layers3,
} from 'lucide-react'
import { VscAzure, VscAzureDevops, VscGithub } from 'react-icons/vsc'
import { DiMsqlServer } from 'react-icons/di'
import { FaAws } from 'react-icons/fa'
import {
  SiGooglecloud, SiDocker, SiKubernetes, SiReact, SiTypescript,
  SiNodedotjs, SiDotnet, SiPython, SiPostgresql, SiMongodb,
  SiTerraform, SiJenkins, SiGraphql, SiRedis, SiTailwindcss,
  SiAngular, SiVuedotjs, SiNextdotjs, SiElasticsearch,
  SiTensorflow, SiPytorch, SiApachespark, SiDatabricks,
  SiGrafana, SiPrometheus, SiHelm, SiAnsible, SiArduino,
  SiRaspberrypi, SiInfluxdb, SiMqtt,
} from 'react-icons/si'
import { useTranslation } from 'react-i18next'
import { LogoLoop } from '@/components/LogoLoop'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionContainer } from '@/components/layout/SectionContainer'
import {
  ServiceBreakdownSection,
  type ServiceBreakdownItem,
} from '@/components/services/ServiceBreakdownSection'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

type ServiceKey =
  | 'enterprise'
  | 'cloud'
  | 'devops'
  | 'digital'
  | 'aiml'
  | 'iot'

interface ServicePageTemplateProps {
  serviceKey: ServiceKey
  icons: LucideIcon[]
}

interface NamedDetailItem {
  title: string
  detail: string
}

interface TechnologyItem {
  name: string
  category: string
  icon: string
}

interface ProblemSectionData {
  overview: string
  painPointsTitle: string
  impactSignalsTitle: string
  painPoints: string[]
  impactSignals: string[]
}

interface ApproachSectionData {
  overview: string
  pillars: NamedDetailItem[]
}

interface PrinciplesSectionData {
  overview: string
  items: NamedDetailItem[]
}

/** Map tech icon keys → react-icons component + brand color */
const TECH_ICON_MAP: Record<string, { icon: IconType; color: string; darkColor?: string }> = {
  react: { icon: SiReact, color: '#61DAFB' },
  nodedotjs: { icon: SiNodedotjs, color: '#339933' },
  dotnet: { icon: SiDotnet, color: '#512BD4' },
  python: { icon: SiPython, color: '#3776AB' },
  typescript: { icon: SiTypescript, color: '#3178C6' },
  graphql: { icon: SiGraphql, color: '#E10098' },
  postgresql: { icon: SiPostgresql, color: '#336791' },
  mongodb: { icon: SiMongodb, color: '#47A248' },
  microsoftazure: { icon: VscAzure, color: '#0078D7' },
  amazonwebservices: { icon: FaAws, color: '#FF9900' },
  googlecloud: { icon: SiGooglecloud, color: '#4285F4' },
  kubernetes: { icon: SiKubernetes, color: '#326CE5' },
  docker: { icon: SiDocker, color: '#2496ED' },
  terraform: { icon: SiTerraform, color: '#7B42BC' },
  azuredevops: { icon: VscAzureDevops, color: '#0078D7' },
  githubactions: { icon: VscGithub, color: '#181717', darkColor: '#ffffff' },
  jenkins: { icon: SiJenkins, color: '#D33833' },
  helm: { icon: SiHelm, color: '#0F1689' },
  ansible: { icon: SiAnsible, color: '#EE0000' },
  prometheus: { icon: SiPrometheus, color: '#E6522C' },
  grafana: { icon: SiGrafana, color: '#F46800' },
  microsoft: { icon: VscAzure, color: '#0078D7' },
  powerbi: { icon: VscAzure, color: '#F2C811' },
  databricks: { icon: SiDatabricks, color: '#FF3621' },
  tensorflow: { icon: SiTensorflow, color: '#FF6F00' },
  pytorch: { icon: SiPytorch, color: '#EE4C2C' },
  apachespark: { icon: SiApachespark, color: '#E25A1C' },
  tableau: { icon: VscAzure, color: '#E97627' },
  microsoftsharepoint: { icon: VscAzure, color: '#0078D4' },
  mqtt: { icon: SiMqtt, color: '#660066' },
  arduino: { icon: SiArduino, color: '#00979D' },
  raspberrypi: { icon: SiRaspberrypi, color: '#A22846' },
  influxdb: { icon: SiInfluxdb, color: '#22ADF6' },
  redis: { icon: SiRedis, color: '#DC382D' },
  elasticsearch: { icon: SiElasticsearch, color: '#005571', darkColor: '#00BFB3' },
  tailwindcss: { icon: SiTailwindcss, color: '#06B6D4' },
  angular: { icon: SiAngular, color: '#DD0031' },
  vuedotjs: { icon: SiVuedotjs, color: '#4FC08D' },
  nextdotjs: { icon: SiNextdotjs, color: '#181717', darkColor: '#ffffff' },
  sqlserver: { icon: DiMsqlServer, color: '#CC2927' },
}

export function ServicePageTemplate({
  serviceKey,
  icons,
}: ServicePageTemplateProps) {
  const { t } = useTranslation('services')
  const baseKey = serviceKey

  const capabilities = t(`${baseKey}.capabilities`, {
    returnObjects: true,
  }) as string[]
  const technologies = t(`${baseKey}.technologies`, {
    returnObjects: true,
  }) as TechnologyItem[]
  const breakdown = t(`${baseKey}.breakdown`, {
    returnObjects: true,
  }) as ServiceBreakdownItem[]
  const problem = t(`${baseKey}.problem`, {
    returnObjects: true,
  }) as ProblemSectionData
  const approach = t(`${baseKey}.approach`, {
    returnObjects: true,
  }) as ApproachSectionData
  const principles = t(`${baseKey}.principles`, {
    returnObjects: true,
  }) as PrinciplesSectionData

  return (
    <div className="min-h-screen">
      <PageHeader
        variant="hero"
        align="center"
        heroSize="large"
        title={t(`${baseKey}.hero.title`)}
        description={t(`${baseKey}.hero.description`)}
        icons={icons}
        actionButtons={
          <>
            <Button size="lg">
              {t('common.ctaPrimary')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline">
              {t('common.ctaSecondary')}
            </Button>
          </>
        }
      />

      {/* ── Problem Framing — split layout with accent left border ── */}
      <PageContainer>
        <SectionContainer
          title={t(`${baseKey}.sections.problem.title`)}
          description={t(`${baseKey}.sections.problem.subtitle`)}
        >
          <p
            className={cn(
              designSystem.typography.body.large,
              designSystem.typography.muted,
              'mb-8 max-w-3xl',
            )}
          >
            {problem.overview}
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Pain points — red-ish accent */}
            <div className="space-y-4 rounded-xl border-l-4 border-destructive/40 bg-card/50 p-6">
              <h3 className={cn(designSystem.typography.heading.h5, 'text-destructive')}>
                {problem.painPointsTitle}
              </h3>
              {problem.painPoints.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <CircleGauge className="mt-0.5 h-4 w-4 shrink-0 text-destructive/70" />
                  <p className={cn(designSystem.typography.body.small, 'text-muted-foreground')}>
                    {point}
                  </p>
                </div>
              ))}
            </div>

            {/* Impact signals — green-ish accent */}
            <div className="space-y-4 rounded-xl border-l-4 border-primary/40 bg-card/50 p-6">
              <h3 className={cn(designSystem.typography.heading.h5, 'text-primary')}>
                {problem.impactSignalsTitle}
              </h3>
              {problem.impactSignals.map((signal) => (
                <div key={signal} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                  <p className={cn(designSystem.typography.body.small, 'text-muted-foreground')}>
                    {signal}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SectionContainer>
      </PageContainer>

      {/* ── Approach — numbered pillars with large index ── */}
      <div className="bg-muted/30">
        <PageContainer>
          <SectionContainer
            title={t(`${baseKey}.sections.approach.title`)}
            description={t(`${baseKey}.sections.approach.subtitle`)}
          >
            <p
              className={cn(
                designSystem.typography.body.base,
                designSystem.typography.muted,
                'mb-8 max-w-3xl',
              )}
            >
              {approach.overview}
            </p>

            <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
              {approach.pillars.map((pillar, i) => (
                <div key={pillar.title} className="relative bg-card p-6">
                  <span className="absolute right-4 top-3 font-mono text-5xl font-bold text-primary/10">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className={cn(designSystem.typography.heading.h5, 'mb-2 pr-10')}>
                    {pillar.title}
                  </h3>
                  <p className={cn(designSystem.typography.body.small, designSystem.typography.muted)}>
                    {pillar.detail}
                  </p>
                </div>
              ))}
            </div>
          </SectionContainer>
        </PageContainer>
      </div>

      {/* ── Principles — horizontal timeline style ── */}
      <PageContainer>
        <SectionContainer
          title={t(`${baseKey}.sections.principles.title`)}
          description={t(`${baseKey}.sections.principles.subtitle`)}
        >
          <p
            className={cn(
              designSystem.typography.body.base,
              designSystem.typography.muted,
              'mb-8 max-w-3xl',
            )}
          >
            {principles.overview}
          </p>

          <div className="space-y-0">
            {principles.items.map((principle, index) => (
              <div
                key={principle.title}
                className={cn(
                  'group relative flex gap-6 py-6',
                  index < principles.items.length - 1 && 'border-b border-border/50',
                )}
              >
                {/* Number marker */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5 font-mono text-sm font-bold text-primary transition-colors group-hover:border-primary group-hover:bg-primary/10">
                  {String(index + 1).padStart(2, '0')}
                </div>

                <div>
                  <h3 className={cn(designSystem.typography.heading.h5, 'mb-1')}>
                    {principle.title}
                  </h3>
                  <p className={cn(designSystem.typography.body.small, designSystem.typography.muted)}>
                    {principle.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionContainer>
      </PageContainer>

      {/* ── Capabilities — compact pill grid with icons ── */}
      <div className="bg-muted/30">
        <PageContainer>
          <SectionContainer
            title={t(`${baseKey}.sections.capabilities.title`)}
            description={t(`${baseKey}.sections.capabilities.subtitle`)}
          >
            <div className="flex flex-wrap gap-3">
              {capabilities.map((capability) => (
                <div
                  key={capability}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-3',
                    'transition-all duration-200 hover:border-primary/30 hover:shadow-sm',
                  )}
                >
                  <Layers3 className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm font-medium">{capability}</span>
                </div>
              ))}
            </div>
          </SectionContainer>
        </PageContainer>
      </div>

      {/* ── Technology Stack — scrolling logo carousel (same as landing page) ── */}
      <PageContainer>
        <SectionContainer
          title={t(`${baseKey}.sections.technology.title`)}
          description={t(`${baseKey}.sections.technology.subtitle`)}
        >
          <div
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
            }}
          >
            <LogoLoop
              logos={technologies.map((tech) => {
                const entry = TECH_ICON_MAP[tech.icon]
                const Icon = entry?.icon
                const color = entry?.color ?? '#888'
                const darkColor = entry?.darkColor
                return {
                  node: (
                    <div className="flex items-center gap-3">
                      {Icon && (
                        darkColor ? (
                          <>
                            <Icon className="w-7 h-7 dark:hidden" style={{ color }} />
                            <Icon className="w-7 h-7 hidden dark:block" style={{ color: darkColor }} />
                          </>
                        ) : (
                          <Icon className="w-7 h-7" style={{ color }} />
                        )
                      )}
                      <span className="font-semibold" style={{ color }}>{tech.name}</span>
                    </div>
                  ),
                  ariaLabel: tech.name,
                  title: tech.category,
                }
              })}
              speed={35}
              direction="left"
              logoHeight={48}
              gap={72}
              pauseOnHover
              scaleOnHover
              ariaLabel="Technology stack"
              className="py-4"
            />
          </div>
        </SectionContainer>
      </PageContainer>

      {/* ── Service Breakdown ── */}
      <div className="bg-muted/30">
        <PageContainer>
          <ServiceBreakdownSection
            title={t(`${baseKey}.sections.breakdown.title`)}
            description={t(`${baseKey}.sections.breakdown.subtitle`)}
            items={breakdown}
          />
        </PageContainer>
      </div>

      {/* ── CTA ── */}
      <PageContainer>
        <SectionContainer>
          <Card
            className={cn(
              'overflow-hidden border-primary/20',
              designSystem.effects.gradient.primary,
            )}
          >
            <CardContent className="py-12 text-center">
              <h3 className={cn(designSystem.typography.heading.h2, 'mb-4')}>
                {t(`${baseKey}.cta.title`)}
              </h3>
              <p
                className={cn(
                  designSystem.typography.body.large,
                  designSystem.typography.muted,
                  'mx-auto mb-6 max-w-2xl',
                )}
              >
                {t(`${baseKey}.cta.description`)}
              </p>
              <Button size="lg">
                {t(`${baseKey}.cta.button`)}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </SectionContainer>
      </PageContainer>
    </div>
  )
}
