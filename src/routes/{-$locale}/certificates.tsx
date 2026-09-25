import { Link, createFileRoute, useLocation } from '@tanstack/react-router'
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  FileCheck2,
  Scale,
  ShieldCheck,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CompanySectionId } from '@/components/company/CompanyPageLayout'
import { Button } from '@/components/ui/button'
import { designSystem } from '@/lib/design-system'
import { PageContainer } from '@/components/layout/PageContainer'
import {
  CompanyPageLayout,
  CompanyPagePanel,
  getCompanySectionLabels,
} from '@/components/company/CompanyPageLayout'
import { cn } from '@/lib/utils'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { localizedPageHead } from '@/lib/seo-meta'
import { useOwnLocaleText } from '@/components/ContactActions'

export const Route = createFileRoute('/{-$locale}/certificates')({
  head: ({ params }) => localizedPageHead('certificates', params.locale),
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
  const text = useOwnLocaleText('pages')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const sectionLabels = getCompanySectionLabels(
    currentLocale,
    CERTIFICATE_SECTION_IDS,
  )

  const credentialHighlights = [
    {
      Icon: BadgeCheck,
      label: t('certificates.highlights.certifiedAccountants'),
    },
    {
      Icon: Scale,
      label: t('certificates.highlights.legalCompliance'),
    },
    {
      Icon: BookOpen,
      label: t('certificates.highlights.continuousEducation'),
    },
    {
      Icon: ShieldCheck,
      label: t('certificates.highlights.ethicalStandards'),
    },
  ]
  const galleryItemsRaw = t('certificates.gallery.items', {
    returnObjects: true,
  })
  const galleryItems = (
    Array.isArray(galleryItemsRaw) ? galleryItemsRaw : []
  ) as Array<CertificateGalleryItem>
  const featuredCertificate = galleryItems[0]
  // The gallery's own lead-in. It used to repeat intro.para2 word for word;
  // a locale without it shows no lead-in rather than the duplicate.
  const galleryDescription = text('certificates.gallery.description', '')

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
              {/* A preview of the first certificate. Its title is a caption
                  here, not a heading: the gallery below lists it again. */}
              {featuredCertificate && (
                <figure className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                  <div className="flex aspect-[4/3] items-center justify-center bg-muted/25 p-6">
                    <img
                      src={featuredCertificate.image}
                      alt={featuredCertificate.title}
                      className="max-h-full max-w-full object-contain"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                  <figcaption className="hidden border-t border-border p-5 sm:block">
                    <span className="flex items-start gap-2 text-base font-semibold tracking-tight text-foreground">
                      <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {featuredCertificate.title}
                    </span>
                    <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                      {featuredCertificate.description}
                    </span>
                  </figcaption>
                </figure>
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
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <p className="flex items-start gap-3 text-sm font-medium leading-6 text-foreground">
                  <BadgeCheck
                    className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>{t('certificates.licenceLine')}</span>
                </p>
                {/* The SRR FBiH licence number and its register link
                    (SRR_LICENCE, SRR_REGISTER_URL, certificates.verifyLink)
                    stay off until the owner confirms the licence is current:
                    the register row lists 08.01.2026 and another firm. */}
              </div>
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
                  {sectionLabels[2] || t('certificates.badge')}
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  {t('certificates.gallery.heading')}
                </h2>
              </div>
              {galleryDescription && (
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:ml-auto md:text-right">
                  {galleryDescription}
                </p>
              )}
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
                {t('certificates.quote')}
              </p>
              <p
                className={cn(
                  designSystem.typography.body.small,
                  designSystem.typography.muted,
                  'mt-4',
                )}
              >
                {t('certificates.quoteAuthor')}
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
