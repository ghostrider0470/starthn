import { createFileRoute, Link, useLocation } from '@tanstack/react-router'
import {
  Briefcase,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Users,
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
import { JobListingsSection } from '@/components/landing/JobListingsSection'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

export const Route = createFileRoute('/{-$locale}/careers')({
  head: () => ({
    meta: [
      { title: 'Careers — Start HN' },
      {
        name: 'description',
        content:
          'Join Start HN. We are a growing accounting agency looking for dedicated professionals in accounting, tax, and financial services.',
      },
      { property: 'og:title', content: 'Careers — Start HN' },
      {
        property: 'og:description',
        content:
          'Join Start HN. We are a growing accounting agency looking for dedicated professionals in accounting, tax, and financial services.',
      },
    ],
  }),
  component: CareersPage,
})

const PERK_ICONS = [ShieldCheck, TrendingUp, Users]

const CAREERS_SECTION_IDS = [
  'overview',
  'jobs',
  'process',
  'start',
] as const satisfies ReadonlyArray<CompanySectionId>

function CareersPage() {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const sectionLabels = getCompanySectionLabels(
    currentLocale,
    CAREERS_SECTION_IDS,
  )

  const stepsRaw = t('careers.process.steps', { returnObjects: true })
  const steps = (typeof stepsRaw === 'string' ? [] : stepsRaw) as {
    title: string
    description: string
  }[]

  const perksRaw = t('careers.perks', { returnObjects: true })
  const perks = (typeof perksRaw === 'string' ? [] : perksRaw) as {
    title: string
    description: string
  }[]

  return (
    <CompanyPageLayout labels={sectionLabels} ids={CAREERS_SECTION_IDS}>
      <CompanyPagePanel>
        <PageContainer maxWidth="xl" spacing="none">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.55fr)] lg:items-end">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Briefcase className="h-4 w-4" />
                {t('careers.badge')}
              </p>
              <h1
                className={cn(
                  designSystem.typography.display.heroCompact,
                  'text-balance text-foreground',
                )}
              >
                {t('careers.hero.title')}{' '}
                <span className="text-primary">
                  {t('careers.hero.titleHighlight')}
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {t('careers.hero.description')}
              </p>
              <Button size="lg" asChild className="mt-8">
                <a href="#jobs">
                  {t('careers.hero.button')}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="divide-y divide-border border-y border-border">
              {perks.map((perk, i) => {
                const Icon = PERK_ICONS[i] ?? ShieldCheck
                return (
                  <div key={perk.title} className="flex items-start gap-4 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {perk.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {perk.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </PageContainer>
      </CompanyPagePanel>

      <CompanyPagePanel tone="muted">
        <PageContainer maxWidth="xl" spacing="none">
          <JobListingsSection />
        </PageContainer>
      </CompanyPagePanel>

      <CompanyPagePanel>
        <PageContainer maxWidth="xl" spacing="none">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {t('careers.badge')}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {t('careers.process.title')}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              {t('careers.process.description')}
            </p>

            <div className="relative mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-4">
              <div
                className="absolute top-6 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] hidden h-px bg-border md:block"
                aria-hidden
              />

              {steps.map((step, index) => (
                <div
                  className="relative flex flex-col items-center text-center"
                  key={step.title}
                >
                  <div className="relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground ring-4 ring-background">
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </CompanyPagePanel>

      <CompanyPagePanel>
        <PageContainer maxWidth="xl" spacing="none">
          <div className="grid gap-8 border-y border-border py-10 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t('careers.badge')}
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                {t('careers.cta.title')}
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {t('careers.cta.description')}
              </p>
            </div>
            <Button size="lg" asChild>
              <Link to={withLocalePath('/contact', currentLocale)}>
                {t('careers.cta.button')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </PageContainer>
      </CompanyPagePanel>
    </CompanyPageLayout>
  )
}
