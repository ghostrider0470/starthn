import { Calendar, Rocket, TrendingUp, Award } from 'lucide-react'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

const milestones = [
  {
    year: '2020',
    icon: Rocket,
    title: 'Foundation',
    description: 'Horizon Tech d.o.o. was founded in Sarajevo with a vision to bridge Bosnia\'s emerging tech talent with global opportunities.',
  },
  {
    year: '2021',
    icon: TrendingUp,
    title: 'Rapid Growth',
    description: 'Expanded our team to 25+ professionals and secured our first international clients across Europe and North America.',
  },
  {
    year: '2022',
    icon: Award,
    title: 'Recognition',
    description: 'Recognized as one of Bosnia\'s fastest-growing tech companies. Launched our Innovation Lab to explore cutting-edge technologies.',
  },
  {
    year: '2023',
    icon: Calendar,
    title: 'Global Reach',
    description: 'Serving 50+ clients across 3 continents with 150+ successful projects delivered. Established partnerships in Asia-Pacific.',
  },
]

export function CompanyStorySection() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="text-center mb-16">
        <h2 className={cn(designSystem.typography.heading.h2, "mb-6 text-4xl font-bold")}>
          Our Journey
        </h2>
        <p className={cn(designSystem.typography.body.large, designSystem.typography.muted, "max-w-3xl mx-auto")}>
          From a small startup in Sarajevo to a global technology partner
        </p>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-gradient-to-b from-primary via-accent to-primary hidden md:block" />

        <div className="space-y-12 md:space-y-16">
          {milestones.map((milestone, index) => {
            const Icon = milestone.icon
            const isEven = index % 2 === 0

            return (
              <div
                key={milestone.year}
                className={cn(
                  "relative flex flex-col md:flex-row items-center gap-8",
                  isEven ? "md:flex-row" : "md:flex-row-reverse"
                )}
              >
                {/* Content */}
                <div className={cn(
                  "w-full md:w-5/12",
                  isEven ? "md:text-right" : "md:text-left",
                  "text-center md:text-inherit"
                )}>
                  <div className={cn(
                    "inline-block px-4 py-1.5 rounded-full bg-primary/10 mb-4",
                    designSystem.typography.body.small,
                    "font-bold text-primary"
                  )}>
                    {milestone.year}
                  </div>
                  <h3 className={cn(designSystem.typography.heading.h4, "mb-3")}>
                    {milestone.title}
                  </h3>
                  <p className={cn(designSystem.typography.body.base, designSystem.typography.muted)}>
                    {milestone.description}
                  </p>
                </div>

                {/* Icon - center */}
                <div className="relative z-10 flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-background border-4 border-primary flex items-center justify-center shadow-lg">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                </div>

                {/* Spacer */}
                <div className="hidden md:block w-5/12" />
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-16 text-center">
        <p className={cn(designSystem.typography.body.large, "font-medium mb-4")}>
          And we're just getting started...
        </p>
        <p className={cn(designSystem.typography.body.base, designSystem.typography.muted, "max-w-2xl mx-auto")}>
          Our journey continues as we push the boundaries of technology, expand our global presence,
          and help businesses transform through innovative solutions.
        </p>
      </div>
    </section>
  )
}
