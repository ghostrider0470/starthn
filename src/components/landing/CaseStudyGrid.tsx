import { CaseStudyCard } from './CaseStudyCard'
import type { CaseStudy } from './CaseStudyCard'
import { StaggerContainer, StaggerItem } from '@/components/animations/FadeIn'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface CaseStudyGridProps {
  caseStudies: CaseStudy[]
}

export function CaseStudyGrid({ caseStudies }: CaseStudyGridProps) {
  return (
    <StaggerContainer
      className={cn(designSystem.grid.responsive.three, designSystem.spacing.gap.lg)}
      staggerChildren={designSystem.animation.motion.stagger.cards}
    >
      {caseStudies.map((caseStudy) => (
        <StaggerItem key={caseStudy.slug}>
          <CaseStudyCard caseStudy={caseStudy} />
        </StaggerItem>
      ))}
    </StaggerContainer>
  )
}
