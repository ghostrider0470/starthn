import { createFileRoute, Link, useLocation } from '@tanstack/react-router'
import {
  Award,
  ArrowRight,
  ShieldCheck,
  BadgeCheck,
  BookOpen,
  FileCheck2,
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
  'gallery',
  'start',
] as const satisfies ReadonlyArray<CompanySectionId>

type CertificateGalleryItem = {
  image: string
  title: string
  description: string
}

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
  const galleryItemsRaw = t('certificates.gallery.items', {
    returnObjects: true,
  })
  const galleryItems = (
    Array.isArray(galleryItemsRaw) ? galleryItemsRaw : []
  ) as CertificateGalleryItem[]
  const featuredCertificate = galleryItems[0]

  return (
    <CompanyPageLayout labels={sectionLabels} ids={CERTIFICATE_SECTION_IDS}>
      <CompanyPagePanel>
        <PageContainer maxWidth="xl" spacing="none">
          <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(19rem,0.58fr)] lg:items-center">
            <div className="min-w-0 max-w-3xl">
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
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <a href="#gallery">
                    {t('certificates.gallery.heading')}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to={withLocalePath('/contact', currentLocale)}>
                    {t('certificates.cta.button')}
                  </Link>
                </Button>
              </div>
            </div>

            <div className="min-w-0 border-y border-border py-5 lg:border-y-0 lg:border-l lg:py-0 lg:pl-8">
              {featuredCertificate && (
                <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                  <div className="flex aspect-[4/3] items-center justify-center bg-muted/25 p-6">
                    <img
                      src={featuredCertificate.image}
                      alt={featuredCertificate.title}
                      className="max-h-full max-w-full object-contain"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                  <div className="hidden border-t border-border p-5 sm:block">
                    <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      <FileCheck2 className="h-4 w-4" />
                      {t('certificates.gallery.heading')}
                    </p>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                      {featuredCertificate.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {featuredCertificate.description}
                    </p>
                  </div>
                </div>
              )}
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
          <div className="min-w-0">
            <div className="mb-8 grid gap-4 lg:grid-cols-[0.55fr_1fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {t('certificates.badge')}
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  {t('certificates.gallery.heading')}
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:ml-auto md:text-right">
                {t('certificates.intro.para2')}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {galleryItems.map((item, index) => (
                <div
                  key={item.title}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex aspect-[4/3] items-center justify-center bg-muted/25 p-6">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex flex-1 flex-col border-t border-border p-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      {String(index + 1).padStart(2, '0')}
                    </p>
                    <h3 className="text-base font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <p
                      className={cn(
                        designSystem.typography.body.small,
                        designSystem.typography.muted,
                        'mt-2 leading-6',
                      )}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </CompanyPagePanel>

      <CompanyPagePanel>
        <PageContainer maxWidth="xl" spacing="none">
          <div className="grid gap-8 border-y border-border py-10 lg:grid-cols-[0.85fr_1fr_auto] lg:items-center">
            <div className="border-b border-border pb-8 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
              <Award className="mb-4 h-10 w-10 text-primary" />
              <p className="text-xl font-semibold leading-snug tracking-tight text-primary md:text-2xl">
                {currentLocale === 'bs-BA'
                  ? '"Svaki certifikat je dokaz da naš rad prolazi kroz najstrože provjere."'
                  : '"Every certificate is proof that our work passes the strictest professional checks."'}
              </p>
              <p
                className={cn(
                  designSystem.typography.body.small,
                  designSystem.typography.muted,
                  'mt-4',
                )}
              >
                {currentLocale === 'bs-BA'
                  ? 'Start HN računovodstvena agencija'
                  : 'Start HN Accounting Agency'}
              </p>
            </div>
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
