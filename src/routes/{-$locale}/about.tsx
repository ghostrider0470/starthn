import { createFileRoute, Link, useLocation } from '@tanstack/react-router'
import { Building2, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { designSystem } from '@/lib/design-system'
import { PageContainer } from '@/components/layout/PageContainer'
import { SectionContainer } from '@/components/layout/SectionContainer'
import { StandardCard } from '@/components/ui/standard-card'
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
          'Meet the team behind Start HN. Enterprise software engineering from Sarajevo to the world.',
      },
      { property: 'og:title', content: 'About — Start HN' },
      {
        property: 'og:description',
        content:
          'Meet the team behind Start HN. Enterprise software engineering from Sarajevo to the world.',
      },
    ],
  }),
  component: AboutPage,
})

function AboutPage() {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const missionPointsRaw = t('about.sections.mission.points', { returnObjects: true })
  const expertisePointsRaw = t('about.sections.expertise.points', { returnObjects: true })
  const approachPointsRaw = t('about.sections.approach.points', { returnObjects: true })

  const sections = [
    {
      key: 'mission',
      title: t('about.sections.mission.title'),
      description: t('about.sections.mission.description'),
      points: (typeof missionPointsRaw === 'string' ? [] : missionPointsRaw) as string[],
    },
    {
      key: 'expertise',
      title: t('about.sections.expertise.title'),
      description: t('about.sections.expertise.description'),
      points: (typeof expertisePointsRaw === 'string' ? [] : expertisePointsRaw) as string[],
    },
    {
      key: 'approach',
      title: t('about.sections.approach.title'),
      description: t('about.sections.approach.description'),
      points: (typeof approachPointsRaw === 'string' ? [] : approachPointsRaw) as string[],
    },
  ]

  return (
    <div className={cn('min-h-screen', designSystem.effects.gradient.subtle)}>
      <PageContainer>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <Badge className="mb-4" variant="secondary">
            <Building2 className="mr-2 h-3 w-3" />
            {t('about.badge')}
          </Badge>
          <h1
            className={cn(
              designSystem.typography.heading.h1,
              'mb-6 sm:text-5xl md:text-6xl',
            )}
          >
            {t('about.hero.titlePrefix')}{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t('about.hero.titleHighlight')}
            </span>
          </h1>
          <p
            className={cn(
              designSystem.typography.body.large,
              designSystem.typography.muted,
              'mb-8 sm:text-xl',
            )}
          >
            {t('about.hero.description')}
          </p>
        </div>
      </PageContainer>

      <PageContainer>
        <SectionContainer spacing="lg">
          <div
            className={cn(
              designSystem.grid.responsive.three,
              designSystem.spacing.gap.lg,
            )}
          >
            {sections.map((section) => (
              <StandardCard key={section.key} variant="hover" className="h-full">
                <h2 className={cn(designSystem.typography.heading.h3, 'mb-3')}>
                  {section.title}
                </h2>
                <p
                  className={cn(
                    designSystem.typography.body.base,
                    designSystem.typography.muted,
                    'mb-4',
                  )}
                >
                  {section.description}
                </p>
                <ul className="space-y-2">
                  {section.points.map((point) => (
                    <li
                      key={point}
                      className={cn(
                        designSystem.typography.body.small,
                        designSystem.typography.muted,
                        'flex items-start gap-2',
                      )}
                    >
                      <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-primary/70" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </StandardCard>
            ))}
          </div>
        </SectionContainer>
      </PageContainer>

      <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
        <PageContainer>
          <SectionContainer spacing="lg" className="text-center">
            <h2 className={cn(designSystem.typography.heading.h2, 'mb-4')}>
              {t('about.cta.title')}
            </h2>
            <p
              className={cn(
                designSystem.typography.body.large,
                designSystem.typography.muted,
                'mx-auto mb-8 max-w-2xl',
              )}
            >
              {t('about.cta.description')}
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link to={withLocalePath('/contact', currentLocale)}>
                  {t('about.cta.primary')}
                  <ArrowRight className="ml-2 h-4 w-4" />
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
          </SectionContainer>
        </PageContainer>
      </div>
    </div>
  )
}
