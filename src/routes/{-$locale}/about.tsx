import { createFileRoute, Link, useLocation } from '@tanstack/react-router'
import {
  Building2,
  ArrowRight,
  CheckCircle2,
  Award,
  BarChart3,
  Settings2,
  UserCheck,
  TrendingUp,
  ShieldCheck,
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
import { featureFlags } from '@/lib/feature-flags'

export const Route = createFileRoute('/{-$locale}/about')({
  head: () => ({
    meta: [
      { title: 'About — Start HN' },
      {
        name: 'description',
        content:
          'Start HN is a Sarajevo-based accounting agency dedicated to the growth and success of entrepreneurs and SMEs in Bosnia and Herzegovina.',
      },
      { property: 'og:title', content: 'About — Start HN' },
      {
        property: 'og:description',
        content:
          'Start HN is a Sarajevo-based accounting agency dedicated to the growth and success of entrepreneurs and SMEs in Bosnia and Herzegovina.',
      },
    ],
  }),
  component: AboutPage,
})

const FEATURE_ICONS: Record<string, React.ElementType> = {
  award: Award,
  barChart3: BarChart3,
  settings2: Settings2,
  userCheck: UserCheck,
  trendingUp: TrendingUp,
  shieldCheck: ShieldCheck,
}

const ABOUT_SECTION_IDS = [
  'overview',
  'story',
  'proof',
  'start',
] as const satisfies ReadonlyArray<CompanySectionId>

function AboutPage() {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const sectionLabels = getCompanySectionLabels(
    currentLocale,
    ABOUT_SECTION_IDS,
  )

  const pillarsRaw = t('about.whyUs.pillars', { returnObjects: true })
  const pillars = (typeof pillarsRaw === 'string' ? [] : pillarsRaw) as string[]

  const featuresRaw = t('about.features', { returnObjects: true })
  const features = (typeof featuresRaw === 'string' ? [] : featuresRaw) as {
    icon: string
    title: string
    description: string
  }[]

  return (
    <CompanyPageLayout labels={sectionLabels} ids={ABOUT_SECTION_IDS}>
      <CompanyPagePanel>
        <PageContainer maxWidth="xl" spacing="none">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.55fr)] lg:items-end">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Building2 className="h-4 w-4" />
                {t('about.badge')}
              </p>
              <h1
                className={cn(
                  designSystem.typography.display.heroCompact,
                  'text-balance text-foreground',
                )}
              >
                {t('about.hero.titlePrefix')}{' '}
                <span className="text-primary">
                  {t('about.hero.titleHighlight')}
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {t('about.hero.description')}
              </p>
            </div>

            <div className="border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pl-8">
              <div className="mb-6 overflow-hidden rounded-lg border border-border">
                <img
                  src="/pages/about-hero.webp"
                  alt="Start HN team collaborating"
                  className="w-full object-cover"
                  loading="eager"
                  decoding="async"
                />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t('about.whyUs.title')}
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t('about.whyUs.subtitle')}
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">
                {t('about.whyUs.description')}
              </p>
            </div>
          </div>
        </PageContainer>
      </CompanyPagePanel>

      <CompanyPagePanel tone="muted">
        <PageContainer maxWidth="xl" spacing="none">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <p className="mb-6 text-2xl font-semibold leading-snug tracking-tight text-primary md:text-3xl">
                "{t('about.welcome.tagline')}"
              </p>
              <div className="space-y-4">
                {(['para1', 'para2', 'para3'] as const).map((key) => (
                  <p
                    key={key}
                    className={cn(
                      designSystem.typography.body.base,
                      designSystem.typography.muted,
                      'leading-7',
                    )}
                  >
                    {t(`about.welcome.${key}`)}
                  </p>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="mb-6 overflow-hidden rounded-lg border border-border">
                <img
                  src="/pages/about-interior.jpg"
                  alt="Accountant reviewing documents with a client"
                  className="w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t('about.whyUs.title')}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {t('about.whyUs.description')}
              </p>
              <ul className="mt-6 divide-y divide-border border-y border-border">
                {pillars.map((pillar) => (
                  <li key={pillar} className="flex items-center gap-3 py-4">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {pillar}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </PageContainer>
      </CompanyPagePanel>

      <CompanyPagePanel>
        <PageContainer maxWidth="xl" spacing="none">
          <div className="mb-8 grid gap-4 lg:grid-cols-[0.5fr_1fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t('about.whyUs.title')}
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {t('about.whyUs.subtitle')}
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:ml-auto md:text-right">
              {t('about.whyUs.description')}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = FEATURE_ICONS[feature.icon] ?? ShieldCheck
              return (
                <div
                  key={feature.title}
                  className="rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {feature.description}
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
                {t('about.badge')}
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                {t('about.cta.title')}
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {t('about.cta.description')}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <Button size="lg" asChild>
                <Link to={withLocalePath('/contact', currentLocale)}>
                  {t('about.cta.primary')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              {featureFlags.caseStudies && (
                <Button size="lg" variant="outline" asChild>
                  <Link to={withLocalePath('/case-studies', currentLocale)}>
                    {t('about.cta.secondary')}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </PageContainer>
      </CompanyPagePanel>
    </CompanyPageLayout>
  )
}
