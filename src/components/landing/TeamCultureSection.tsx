import { Coffee, Gamepad2, Laptop, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { PageContainer } from '@/components/layout/PageContainer'
import { StandardCard } from '@/components/ui/standard-card'

export function TeamCultureSection() {
  const { t } = useTranslation('pages')

  const cultureHighlights = [
    {
      icon: Laptop,
      title: t('team.culture.remoteFirst.title'),
      description: t('team.culture.remoteFirst.description'),
    },
    {
      icon: Users,
      title: t('team.culture.collaborative.title'),
      description: t('team.culture.collaborative.description'),
    },
    {
      icon: Coffee,
      title: t('team.culture.workLife.title'),
      description: t('team.culture.workLife.description'),
    },
    {
      icon: Gamepad2,
      title: t('team.culture.innovation.title'),
      description: t('team.culture.innovation.description'),
    },
  ]

  const stats = [
    { value: '25+', label: t('team.culture.stats.teamMembers') },
    { value: '15+', label: t('team.culture.stats.countries') },
    { value: '10+', label: t('team.culture.stats.techStacks') },
    { value: '100%', label: t('team.culture.stats.remoteReady') },
  ]

  return (
    <section className="bg-muted/30">
      <PageContainer>
        <div className="py-16 md:py-24">
          <div className="text-center mb-12">
            <h2
              className={cn(
                designSystem.typography.heading.h2,
                'mb-4',
              )}
            >
              {t('team.culture.title')}
            </h2>
            <p
              className={cn(
                designSystem.typography.body.large,
                designSystem.typography.muted,
                'max-w-3xl mx-auto',
              )}
            >
              {t('team.culture.description')}
            </p>
          </div>

          <div
            className={cn(
              designSystem.grid.responsive.four,
              designSystem.spacing.gap.md,
              'mb-16',
            )}
          >
            {cultureHighlights.map((highlight) => {
              const Icon = highlight.icon
              return (
                <StandardCard
                  key={highlight.title}
                  variant="hover"
                  padding="compact"
                >
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3
                    className={cn(
                      designSystem.typography.heading.h5,
                      'mb-1.5',
                    )}
                  >
                    {highlight.title}
                  </h3>
                  <p
                    className={cn(
                      designSystem.typography.body.small,
                      designSystem.typography.muted,
                    )}
                  >
                    {highlight.description}
                  </p>
                </StandardCard>
              )
            })}
          </div>

          <div
            className={cn(
              designSystem.grid.responsive.four,
              designSystem.spacing.gap.md,
            )}
          >
            {stats.map((stat) => (
              <div
                key={stat.value}
                className="text-center p-6 rounded-lg bg-background border"
              >
                <p
                  className={cn(
                    designSystem.typography.heading.h2,
                    'text-primary mb-2',
                  )}
                >
                  {stat.value}
                </p>
                <p
                  className={cn(
                    designSystem.typography.body.small,
                    designSystem.typography.muted,
                  )}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </PageContainer>
    </section>
  )
}
