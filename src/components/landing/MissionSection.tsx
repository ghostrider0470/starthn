import { Target, Eye, Lightbulb } from 'lucide-react'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { StandardCard } from '@/components/ui/standard-card'

export function MissionSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="text-center mb-16">
        <h2 className={cn(designSystem.typography.heading.h1, "mb-6 text-4xl md:text-5xl font-bold")}>
          Our Mission & Vision
        </h2>
        <p className={cn(designSystem.typography.body.large, designSystem.typography.muted, "max-w-3xl mx-auto")}>
          Building tomorrow's technology solutions today, empowering businesses to thrive in the digital age
        </p>
      </div>

      <div className={cn(designSystem.grid.responsive.three, designSystem.spacing.gap.lg)}>
        <StandardCard variant="hover" className="text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <h3 className={cn(designSystem.typography.heading.h4, "mb-4")}>
            Our Mission
          </h3>
          <p className={cn(designSystem.typography.body.base, designSystem.typography.muted)}>
            To deliver cutting-edge technology solutions that transform businesses,
            enhance operational efficiency, and drive sustainable growth through innovation
            and excellence.
          </p>
        </StandardCard>

        <StandardCard variant="hover" className="text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-accent/10">
            <Eye className="h-8 w-8 text-accent" />
          </div>
          <h3 className={cn(designSystem.typography.heading.h4, "mb-4")}>
            Our Vision
          </h3>
          <p className={cn(designSystem.typography.body.base, designSystem.typography.muted)}>
            To be the leading technology partner for enterprises worldwide, recognized for
            our innovative solutions, exceptional talent, and commitment to client success
            across all continents.
          </p>
        </StandardCard>

        <StandardCard variant="hover" className="text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
            <Lightbulb className="h-8 w-8 text-primary" />
          </div>
          <h3 className={cn(designSystem.typography.heading.h4, "mb-4")}>
            Our Approach
          </h3>
          <p className={cn(designSystem.typography.body.base, designSystem.typography.muted)}>
            We combine deep technical expertise with strategic thinking, delivering
            solutions that not only meet today's needs but anticipate tomorrow's challenges
            and opportunities.
          </p>
        </StandardCard>
      </div>
    </section>
  )
}
