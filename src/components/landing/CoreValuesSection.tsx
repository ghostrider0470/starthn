import { Zap, Users, Shield, Heart, Sparkles, TrendingUp } from 'lucide-react'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { StandardCard } from '@/components/ui/standard-card'

const values = [
  {
    icon: Zap,
    title: 'Innovation First',
    description: 'We embrace cutting-edge technologies and continuously push boundaries to deliver forward-thinking solutions.',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: Shield,
    title: 'Quality & Excellence',
    description: 'We maintain the highest standards in everything we do, from code quality to client communication.',
    color: 'text-accent',
    bgColor: 'bg-accent/10',
  },
  {
    icon: Users,
    title: 'Collaboration',
    description: 'We believe in the power of teamwork, fostering an environment where diverse perspectives drive success.',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: Heart,
    title: 'Client Success',
    description: 'Your success is our success. We are deeply committed to understanding and exceeding client expectations.',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  {
    icon: Sparkles,
    title: 'Transparency',
    description: 'We build trust through honest communication, clear processes, and accountability at every step.',
    color: 'text-accent',
    bgColor: 'bg-accent/10',
  },
  {
    icon: TrendingUp,
    title: 'Continuous Growth',
    description: 'We invest in our team\'s development and stay ahead of industry trends to deliver cutting-edge solutions.',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
]

export function CoreValuesSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="text-center mb-16">
        <h2 className={cn(designSystem.typography.heading.h2, "mb-6 text-4xl font-bold")}>
          Our Core Values
        </h2>
        <p className={cn(designSystem.typography.body.large, designSystem.typography.muted, "max-w-3xl mx-auto")}>
          The principles that guide everything we do
        </p>
      </div>

      <div className={cn(designSystem.grid.responsive.three, designSystem.spacing.gap.lg)}>
        {values.map((value) => {
          const Icon = value.icon
          return (
            <StandardCard
              key={value.title}
              variant="hover"
              className="group"
            >
              <div className={cn("mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl transition-transform group-hover:scale-110", value.bgColor)}>
                <Icon className={cn("h-7 w-7", value.color)} />
              </div>
              <h3 className={cn(designSystem.typography.heading.h4, "mb-3")}>
                {value.title}
              </h3>
              <p className={cn(designSystem.typography.body.base, designSystem.typography.muted)}>
                {value.description}
              </p>
            </StandardCard>
          )
        })}
      </div>
    </section>
  )
}
