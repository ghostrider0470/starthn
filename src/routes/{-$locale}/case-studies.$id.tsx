import { Link, createFileRoute, redirect, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { CaseStudyDetail } from '@/components/case-studies/CaseStudyDetail'
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { Button } from '@/components/ui/button'
import { getCaseStudyBySlug } from '@/data/case-studies'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { featureFlags } from '@/lib/feature-flags'

export const Route = createFileRoute('/{-$locale}/case-studies/$id')({
  head: ({ loaderData }) => ({
    meta: [
      { title: `${(loaderData as any)?.title ?? 'Case Study'} — Horizon Tech` },
      {
        name: 'description',
        content:
          (loaderData as any)?.excerpt ??
          'Real-world enterprise software, AI, and cloud architecture projects by Horizon Tech.',
      },
      {
        property: 'og:title',
        content: `${(loaderData as any)?.title ?? 'Case Study'} — Horizon Tech`,
      },
      {
        property: 'og:description',
        content: (loaderData as any)?.excerpt ?? '',
      },
    ],
  }),
  beforeLoad: () => {
    if (!featureFlags.caseStudies) throw redirect({ to: '/' as any, replace: true })
  },
  component: CaseStudyDetailPage,
})

function CaseStudyDetailPage() {
  const { t } = useTranslation('pages')
  const { id } = Route.useParams()
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const backHref = withLocalePath('/case-studies', currentLocale)
  const caseStudy = getCaseStudyBySlug(id)

  if (!caseStudy) {
    return (
      <PageContainer>
        <SectionContainer
          spacing="lg"
          className="mx-auto max-w-3xl text-center"
        >
          <h1 className={cn(designSystem.typography.heading.h2, 'mb-3')}>
            {t('caseStudyDetail.notFound.title')}
          </h1>
          <p
            className={cn(
              designSystem.typography.body.base,
              designSystem.typography.muted,
              'mb-6',
            )}
          >
            {t('caseStudyDetail.notFound.description', { id })}
          </p>
          <Button asChild>
            <Link to={backHref}>
              {t('caseStudyDetail.notFound.back')}
            </Link>
          </Button>
        </SectionContainer>
      </PageContainer>
    )
  }

  return <CaseStudyDetail caseStudy={caseStudy} backHref={backHref} />
}
