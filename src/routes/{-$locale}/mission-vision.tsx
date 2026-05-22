import { createFileRoute, Link, useLocation } from '@tanstack/react-router'
import {
  Target,
  ShieldCheck,
  Users,
  Zap,
  Lock,
  ArrowRight,
  Compass,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { designSystem } from '@/lib/design-system'
import { PageContainer } from '@/components/layout/PageContainer'
import {
  CompanyPageLayout,
  CompanyPagePanel,
  getCompanySectionLabels,
  type CompanySectionId,
} from '@/components/company/CompanyPageLayout'
import { cn } from '@/lib/utils'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

export const Route = createFileRoute('/{-$locale}/mission-vision')({
  head: () => ({
    meta: [
      { title: 'Mission, Vision & Values — Start HN' },
      {
        name: 'description',
        content:
          'The mission, vision, and core values that guide Start HN accounting agency in every client engagement.',
      },
      { property: 'og:title', content: 'Mission, Vision & Values — Start HN' },
    ],
  }),
  component: MissionVisionPage,
})

const VALUE_ICONS: Record<string, React.ElementType> = {
  target: Target,
  shieldCheck: ShieldCheck,
  users: Users,
  zap: Zap,
  lock: Lock,
}

const MISSION_SECTION_IDS = [
  'overview',
  'story',
  'values',
  'start',
] as const satisfies ReadonlyArray<CompanySectionId>

function MissionVisionPage() {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const sectionLabels = getCompanySectionLabels(
    currentLocale,
    MISSION_SECTION_IDS,
  )

  const valuesRaw = t('missionVision.values.items', { returnObjects: true })
  const values = (typeof valuesRaw === 'string' ? [] : valuesRaw) as {
    icon: string
    title: string
    description: string
  }[]

  return (
    <CompanyPageLayout labels={sectionLabels} ids={MISSION_SECTION_IDS}>
      <CompanyPagePanel>
        <PageContainer maxWidth="xl" spacing="none">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.55fr)] lg:items-end">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Compass className="h-4 w-4" />
                {t('missionVision.badge')}
              </p>
              <h1
                className={cn(
                  designSystem.typography.display.heroCompact,
                  'text-balance text-foreground',
                )}
              >
                {t('missionVision.hero.title')}{' '}
                <span className="text-primary">
                  {t('missionVision.hero.titleHighlight')}
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {t('missionVision.hero.description')}
              </p>
            </div>

            <div className="border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pl-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t('missionVision.values.label')}
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t('missionVision.values.heading')}
              </h2>
            </div>
          </div>
        </PageContainer>
      </CompanyPagePanel>

      <CompanyPagePanel tone="muted">
        <PageContainer maxWidth="xl" spacing="none">
          <div className="grid grid-cols-1 gap-0 divide-y divide-border border-y border-border md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="py-10 pr-0 md:pr-10">
              <span className="mb-4 block text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t('missionVision.mission.label')}
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t('missionVision.mission.heading')}
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
                {t('missionVision.mission.body')}
              </p>
            </div>

            <div className="py-10 md:pl-10">
              <span className="mb-4 block text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t('missionVision.vision.label')}
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t('missionVision.vision.heading')}
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
                {t('missionVision.vision.body')}
              </p>
            </div>
          </div>
        </PageContainer>
      </CompanyPagePanel>

      <CompanyPagePanel>
        <PageContainer maxWidth="xl" spacing="none">
          <div className="mb-8 grid gap-4 lg:grid-cols-[0.5fr_1fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t('missionVision.values.label')}
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {t('missionVision.values.heading')}
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:ml-auto md:text-right">
              {t('missionVision.hero.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {values.map((value) => {
              const Icon = VALUE_ICONS[value.icon] ?? ShieldCheck
              return (
                <div
                  key={value.title}
                  className="rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {value.description}
                  </p>
                </div>
              )
            })}
          </div>
        </PageContainer>
      </CompanyPagePanel>

      <CompanyPagePanel>
        <PageContainer maxWidth="xl" spacing="none">
          <div className="grid gap-8 border-y border-border py-10 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t('missionVision.badge')}
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                {t('missionVision.cta.title')}
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {t('missionVision.cta.description')}
              </p>
            </div>
            <Button size="lg" asChild>
              <Link to={withLocalePath('/contact', currentLocale)}>
                {t('missionVision.cta.button')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </PageContainer>
      </CompanyPagePanel>
    </CompanyPageLayout>
  )
}
