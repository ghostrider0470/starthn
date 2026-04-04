import {
  Briefcase,
  GraduationCap,
  Heart,
  Plane,
  DollarSign,
  Home,
  Zap,
  Trophy
} from 'lucide-react'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { StandardCard } from '@/components/ui/standard-card'

const benefits = [
  {
    icon: DollarSign,
    title: 'Competitive Salary',
    description: 'Market-leading compensation packages with performance bonuses and equity options.',
  },
  {
    icon: Home,
    title: 'Remote-First',
    description: 'Work from anywhere with flexible hours. Office space available in Sarajevo.',
  },
  {
    icon: Plane,
    title: 'Generous PTO',
    description: '25+ days annual leave, paid sick leave, and parental leave policies.',
  },
  {
    icon: Heart,
    title: 'Health & Wellness',
    description: 'Comprehensive health insurance, mental health support, and fitness benefits.',
  },
  {
    icon: GraduationCap,
    title: 'Learning Budget',
    description: 'Annual education budget for courses, conferences, and certifications.',
  },
  {
    icon: Briefcase,
    title: 'Career Growth',
    description: 'Clear career paths, mentorship programs, and leadership opportunities.',
  },
  {
    icon: Zap,
    title: 'Latest Tech',
    description: 'Top-tier equipment and access to cutting-edge tools and technologies.',
  },
  {
    icon: Trophy,
    title: 'Team Events',
    description: 'Regular team building, hackathons, and company-wide celebrations.',
  },
]

export function BenefitsSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="text-center mb-16">
        <h2 className={cn(designSystem.typography.heading.h2, "mb-6 text-4xl font-bold")}>
          Why Work at Horizon Tech?
        </h2>
        <p className={cn(designSystem.typography.body.large, designSystem.typography.muted, "max-w-3xl mx-auto")}>
          We invest in our team's success with comprehensive benefits and a supportive culture
        </p>
      </div>

      <div className={cn(designSystem.grid.responsive.four, designSystem.spacing.gap.lg)}>
        {benefits.map((benefit) => {
          const Icon = benefit.icon
          return (
            <StandardCard
              key={benefit.title}
              variant="hover"
              className="text-center group"
            >
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
                <Icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className={cn(designSystem.typography.heading.h5, "mb-2")}>
                {benefit.title}
              </h3>
              <p className={cn(designSystem.typography.body.small, designSystem.typography.muted)}>
                {benefit.description}
              </p>
            </StandardCard>
          )
        })}
      </div>
    </section>
  )
}
