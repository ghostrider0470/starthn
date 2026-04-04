import { Shield, Scale, Users, Award } from 'lucide-react'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'
import { StandardCard } from '@/components/ui/standard-card'

const values = [
  {
    icon: Shield,
    title: 'Integritet',
    description: 'Svaki naš savjet i preporuka slijede visoke profesionalne i etičke standarde, s ciljem potpunog očuvanja vaših interesa.',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: Scale,
    title: 'Odgovornost',
    description: 'Preuzimamo punu odgovornost za kvalitet naših usluga i pravovremeno ispunjavanje svih zakonskih obaveza.',
    color: 'text-accent',
    bgColor: 'bg-accent/10',
  },
  {
    icon: Users,
    title: 'Pristupačnost',
    description: 'Dostupni smo za sva pitanja i pojašnjenja — komunikacija sa klijentima je brza, jasna i otvorena.',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: Award,
    title: 'Izvrsnost',
    description: 'Težimo izvrsnosti u svemu što radimo — od preciznosti podataka do kvaliteta savjetodavnih usluga.',
    color: 'text-accent',
    bgColor: 'bg-accent/10',
  },
]

export function CoreValuesSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-16">
          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground/80 mb-3 block">
            Naše vrijednosti
          </span>
          <h2 className={cn(designSystem.typography.heading.h2, "mb-6 text-4xl font-bold")}>
            Gradimo povjerenje, težimo izvrsnosti
          </h2>
          <p className={cn(designSystem.typography.body.large, designSystem.typography.muted, "max-w-3xl mx-auto")}>
            U Start HN se vodimo ključnim vrijednostima koje osiguravaju kvalitet i povjerenje u svim aspektima našeg rada.
          </p>
        </div>

        <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4", designSystem.spacing.gap.lg)}>
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
      </div>
    </section>
  )
}
