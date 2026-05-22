import { createFileRoute, Link, useLocation } from '@tanstack/react-router'
import {
  Award,
  ArrowRight,
  ShieldCheck,
  BadgeCheck,
  BookOpen,
  Scale,
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

export const Route = createFileRoute('/{-$locale}/certificates')({
  head: () => ({
    meta: [
      { title: 'Certificates & Recognition — Start HN' },
      {
        name: 'description',
        content:
          'Start HN holds professional accounting licences and certifications confirming our expertise, legal compliance, and commitment to clients.',
      },
      {
        property: 'og:title',
        content: 'Certificates & Recognition — Start HN',
      },
    ],
  }),
  component: CertificatesPage,
})

const CERTIFICATE_SECTION_IDS = [
  'overview',
  'proof',
  'values',
  'start',
] as const satisfies ReadonlyArray<CompanySectionId>

function CertificatesPage() {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const sectionLabels = getCompanySectionLabels(
    currentLocale,
    CERTIFICATE_SECTION_IDS,
  )

  const credentialHighlights = [
    {
      Icon: BadgeCheck,
      label:
        currentLocale === 'bs-BA'
          ? 'Certificirani računovođe'
          : 'Certified Accountants',
    },
    {
      Icon: Scale,
      label:
        currentLocale === 'bs-BA' ? 'Zakonska usklađenost' : 'Legal Compliance',
    },
    {
      Icon: BookOpen,
      label:
        currentLocale === 'bs-BA'
          ? 'Kontinuirana edukacija'
          : 'Continuous Education',
    },
    {
      Icon: ShieldCheck,
      label:
        currentLocale === 'bs-BA' ? 'Etički standardi' : 'Ethical Standards',
    },
  ]

  return (
    <CompanyPageLayout labels={sectionLabels} ids={CERTIFICATE_SECTION_IDS}>
      <CompanyPagePanel>
        <PageContainer maxWidth="xl" spacing="none">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.55fr)] lg:items-end">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Award className="h-4 w-4" />
                {t('certificates.badge')}
              </p>
              <h1
                className={cn(
                  designSystem.typography.display.heroCompact,
                  'text-balance text-foreground',
                )}
              >
                {t('certificates.hero.title')}{' '}
                <span className="text-primary">
                  {t('certificates.hero.titleHighlight')}
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {t('certificates.hero.description')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {credentialHighlights.map(({ Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </CompanyPagePanel>

      <CompanyPagePanel tone="muted">
        <PageContainer maxWidth="xl" spacing="none">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t('certificates.intro.heading')}
              </h2>
              <p
                className={cn(
                  designSystem.typography.body.base,
                  designSystem.typography.muted,
                  'leading-7',
                )}
              >
                {t('certificates.intro.para1')}
              </p>
              <p
                className={cn(
                  designSystem.typography.body.base,
                  designSystem.typography.muted,
                  'leading-7',
                )}
              >
                {t('certificates.intro.para2')}
              </p>
            </div>

            <div className="lg:col-span-2">
              <div className="divide-y divide-border border-y border-border">
                {credentialHighlights.map(({ Icon, label }) => (
                  <div key={label} className="flex items-center gap-4 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PageContainer>
      </CompanyPagePanel>

      <CompanyPagePanel>
        <PageContainer maxWidth="xl" spacing="none">
          <div className="mx-auto max-w-3xl border-y border-border py-12 text-center">
            <Award className="mx-auto mb-4 h-10 w-10 text-primary" />
            <p className="mb-4 text-2xl font-semibold leading-snug tracking-tight text-primary md:text-3xl">
              {currentLocale === 'bs-BA'
                ? '"Svaki certifikat je dokaz da naš rad prolazi kroz najstrože provjere."'
                : '"Every certificate is proof that our work passes the strictest professional checks."'}
            </p>
            <p
              className={cn(
                designSystem.typography.body.base,
                designSystem.typography.muted,
              )}
            >
              {currentLocale === 'bs-BA'
                ? 'Start HN računovodstvena agencija'
                : 'Start HN Accounting Agency'}
            </p>
          </div>
        </PageContainer>
      </CompanyPagePanel>

      <CompanyPagePanel>
        <PageContainer maxWidth="xl" spacing="none">
          <div className="grid gap-8 border-y border-border py-10 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {t('certificates.badge')}
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                {t('certificates.cta.title')}
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {t('certificates.cta.description')}
              </p>
            </div>
            <Button size="lg" asChild>
              <Link to={withLocalePath('/contact', currentLocale)}>
                {t('certificates.cta.button')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </PageContainer>
      </CompanyPagePanel>
    </CompanyPageLayout>
  )
}
