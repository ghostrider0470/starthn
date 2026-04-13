import { MapPin, Clock, Briefcase, ArrowRight, Ban } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { StandardCard } from '@/components/ui/standard-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function JobListingsSection() {
  const { t } = useTranslation('pages')

  const jobsRaw = t('careers.jobs.listings', { returnObjects: true })
  const jobs = (typeof jobsRaw === 'string' ? [] : jobsRaw) as {
    title: string
    department: string
    location: string
    type: string
    description: string
    tags: string[]
  }[]

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="text-center mb-16">
        <h2
          className={cn(
            designSystem.typography.heading.h2,
            'mb-6 text-4xl font-bold',
          )}
        >
          {t('careers.jobs.title')}
        </h2>
        <p
          className={cn(
            designSystem.typography.body.large,
            designSystem.typography.muted,
            'max-w-3xl mx-auto mb-6',
          )}
        >
          {t('careers.jobs.description')}
        </p>
        <Badge
          variant="outline"
          className="border-muted-foreground/30 text-muted-foreground px-4 py-1.5 text-sm"
        >
          <Ban className="mr-2 h-3.5 w-3.5" />
          {t('careers.jobs.unavailable')}
        </Badge>
      </div>

      <div className="space-y-6 opacity-50 pointer-events-none select-none">
        {jobs.map((job) => (
          <StandardCard key={job.title} variant="hover" className="group">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1">
                    <h3
                      className={cn(
                        designSystem.typography.heading.h4,
                        'mb-2',
                      )}
                    >
                      {job.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 mb-3">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Briefcase className="h-4 w-4" />
                        <span className={designSystem.typography.body.small}>
                          {job.department}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className={designSystem.typography.body.small}>
                          {job.location}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className={designSystem.typography.body.small}>
                          {job.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p
                  className={cn(
                    designSystem.typography.body.base,
                    designSystem.typography.muted,
                    'mb-3',
                  )}
                >
                  {job.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {job.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="md:flex-shrink-0">
                <Button
                  variant="outline"
                  className="w-full md:w-auto"
                  disabled
                >
                  {t('careers.jobs.apply')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </StandardCard>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p
          className={cn(
            designSystem.typography.body.large,
            designSystem.typography.muted,
            'mb-4',
          )}
        >
          {t('careers.jobs.noMatch')}
        </p>
        <Button variant="outline" size="lg">
          {t('careers.jobs.sendCv')}
        </Button>
      </div>
    </section>
  )
}
