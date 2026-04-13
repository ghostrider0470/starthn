import { TrendingUp, Users, BarChart3, Clock } from 'lucide-react'

const stats = [
  {
    icon: Users,
    value: '200+',
    label: 'Projects Delivered',
    description: 'Across diverse industries',
  },
  {
    icon: BarChart3,
    value: '50+',
    label: 'Enterprise Clients',
    description: 'Trusting our solutions',
  },
  {
    icon: Clock,
    value: '99%',
    label: 'Client Satisfaction',
    description: 'Consistently exceeding expectations',
  },
  {
    icon: TrendingUp,
    value: '99.9%',
    label: 'Uptime SLA',
    description: 'Reliable systems, always on',
  },
]

export function StatsSection() {
  return (
    <section className="bg-gradient-to-b from-background via-primary/[0.04] to-background px-4 py-24">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Trusted by Industry Leaders Worldwide
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Partnering with forward-thinking organizations to build
            exceptional software
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-lg border bg-background p-6 transition-all hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="relative">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <p className="font-semibold">{stat.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {stat.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          <div className="rounded-lg border bg-background p-6">
            <h3 className="mb-2 text-lg font-semibold">Technical Excellence</h3>
            <p className="text-sm text-muted-foreground">
              Built by senior engineers with deep expertise in cloud-native
              architectures, microservices, and modern DevOps practices.
            </p>
          </div>

          <div className="rounded-lg border bg-background p-6">
            <h3 className="mb-2 text-lg font-semibold">Battle-Tested</h3>
            <p className="text-sm text-muted-foreground">
              Our solutions are proven in production at scale, handling
              millions of transactions across diverse industries.
            </p>
          </div>

          <div className="rounded-lg border bg-background p-6">
            <h3 className="mb-2 text-lg font-semibold">
              Continuous Delivery
            </h3>
            <p className="text-sm text-muted-foreground">
              Automated pipelines, comprehensive testing, and iterative
              releases ensure rapid, reliable delivery.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
