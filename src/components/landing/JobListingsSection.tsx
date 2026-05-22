import { ArrowRight, CheckCircle2, Gift, ClipboardList, UserCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface JobListing {
  title: string
  summary: string
  responsibilities: string[]
  requirements: string[]
  offers: string[]
}

interface JobLabels {
  responsibilities: string
  requirements: string
  offers: string
}

const SECTION_ICONS = {
  responsibilities: ClipboardList,
  requirements: UserCheck,
  offers: Gift,
}

export function JobListingsSection() {
  const { t } = useTranslation('pages')

  const jobsRaw = t('careers.jobs.listings', { returnObjects: true })
  const jobs = (typeof jobsRaw === 'string' ? [] : jobsRaw) as JobListing[]

  const labelsRaw = t('careers.jobs.labels', { returnObjects: true })
  const labels = (typeof labelsRaw === 'string' ? {} : labelsRaw) as JobLabels

  return (
    <div className="py-14">
      <div className="mb-10 text-center">
        <h2 className={cn(designSystem.typography.heading.h2, 'mb-3')}>
          {t('careers.jobs.title')}
        </h2>
        <p className={cn(designSystem.typography.body.large, designSystem.typography.muted)}>
          {t('careers.jobs.description')}
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-3 max-w-3xl mx-auto">
        {jobs.map((job, index) => (
          <AccordionItem
            key={job.title}
            value={`job-${index}`}
            className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden last:border-b border-l-4 border-l-primary"
          >
            <AccordionTrigger className="hover:no-underline px-6 py-5 text-base [&>svg]:shrink-0">
              <div className="flex items-start gap-4 flex-1 text-left">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mt-0.5">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className={cn(designSystem.typography.heading.h4)}>{job.title}</p>
                  <p className={cn(designSystem.typography.body.small, designSystem.typography.muted, 'mt-1 font-normal')}>
                    {job.summary}
                  </p>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-6">
              <div className="grid md:grid-cols-3 gap-6 pb-2 pt-2 border-t border-border">
                <JobSection
                  icon={SECTION_ICONS.responsibilities}
                  title={labels.responsibilities}
                  items={job.responsibilities}
                  iconColor="text-blue-500"
                  bgColor="bg-blue-500/10"
                />
                <JobSection
                  icon={SECTION_ICONS.requirements}
                  title={labels.requirements}
                  items={job.requirements}
                  iconColor="text-amber-500"
                  bgColor="bg-amber-500/10"
                />
                <JobSection
                  icon={SECTION_ICONS.offers}
                  title={labels.offers}
                  items={job.offers}
                  iconColor="text-green-500"
                  bgColor="bg-green-500/10"
                />
              </div>
              <div className="py-4">
                <Button size="sm" asChild>
                  <a href="mailto:info@starthn.ba">
                    {t('careers.jobs.apply')}
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="mt-10 text-center">
        <p className={cn(designSystem.typography.body.base, designSystem.typography.muted, 'mb-3')}>
          {t('careers.jobs.noMatch')}
        </p>
        <Button variant="outline" asChild>
          <a href="mailto:info@starthn.ba">
            {t('careers.jobs.sendCv')}
          </a>
        </Button>
      </div>
    </div>
  )
}

function JobSection({
  icon: Icon,
  title,
  items,
  iconColor,
  bgColor,
}: {
  icon: React.ElementType
  title: string
  items: string[]
  iconColor: string
  bgColor: string
}) {
  return (
    <div className="pt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', bgColor)}>
          <Icon className={cn('h-3.5 w-3.5', iconColor)} />
        </span>
        <h4 className={cn(designSystem.typography.heading.h6)}>{title}</h4>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            <span className={cn(designSystem.typography.body.small, designSystem.typography.muted)}>
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
