import { ArrowRight, TrendingUp } from 'lucide-react'
import { Link, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { StandardCard } from '@/components/ui/standard-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'
import type {
  CaseStudy,
  CaseStudyIndustry,
  CaseStudyArchitectureDecision,
  CaseStudyResult,
} from '@/services/case-study.service'

export type { CaseStudy, CaseStudyIndustry, CaseStudyArchitectureDecision, CaseStudyResult }

interface CaseStudyCardProps {
  caseStudy: CaseStudy
}

export function CaseStudyCard({ caseStudy }: CaseStudyCardProps) {
  const location = useLocation()
  const { t } = useTranslation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const detailHref = withLocalePath(
    `/case-studies/${caseStudy.slug}`,
    currentLocale,
  )
  const previewResults = caseStudy.results.slice(0, 2)
  const previewTechStack = caseStudy.techStack.slice(0, 3)
  const extraTechStackCount = caseStudy.techStack.length - previewTechStack.length

  return (
    <StandardCard variant="hover" className="h-full flex flex-col group">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <Badge variant="secondary" className="mb-2">
              {t(`caseStudyCard.industries.${caseStudy.industry}`)}
            </Badge>
            <Link to={detailHref}>
              <h3
                className={cn(
                  designSystem.typography.heading.h4,
                  'mb-2 group-hover:text-primary transition-colors',
                )}
              >
                {caseStudy.title}
              </h3>
            </Link>
            <p
              className={cn(
                designSystem.typography.body.small,
                'text-muted-foreground font-medium',
              )}
            >
              {caseStudy.client}
            </p>
          </div>
        </div>
        <p
          className={cn(
            designSystem.typography.body.base,
            designSystem.typography.muted,
          )}
        >
          {caseStudy.description}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4 py-4 border-y">
        {previewResults.map((metric) => (
          <div key={metric.metric}>
            <div className="flex items-start gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
              <p
                className={cn(
                  designSystem.typography.heading.h4,
                  'text-primary',
                )}
              >
                {metric.value}
              </p>
            </div>
            <p
              className={cn(
                designSystem.typography.body.small,
                designSystem.typography.muted,
              )}
            >
              {metric.metric}
            </p>
          </div>
        ))}
      </div>

      {/* Tech stack */}
      <div className="flex flex-wrap gap-2 mb-4">
        {previewTechStack.map((tech) => (
          <Badge key={tech} variant="outline" className="text-xs">
            {tech}
          </Badge>
        ))}
        {extraTechStackCount > 0 && (
          <Badge variant="outline" className="text-xs">
            +{extraTechStackCount}
          </Badge>
        )}
      </div>

      {/* CTA */}
      <div className="mt-auto">
        <Button
          asChild
          variant="ghost"
          className="w-full justify-between group-hover:bg-primary/10 transition-colors"
        >
          <Link to={detailHref}>
            {t('caseStudyCard.read')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </StandardCard>
  )
}
