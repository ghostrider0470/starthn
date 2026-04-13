import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AzureIcon } from '@/components/ui/azure-icon'
import { Badge } from '@/components/ui/badge'

const features = [
  {
    iconPath: '/Icons/monitor/00012-icon-service-Application-Insights.svg',
    title: 'Lightning Fast',
    description:
      'Built with Vite for instant HMR and optimized production builds.',
  },
  {
    iconPath: '/Icons/general/10787-icon-service-Code.svg',
    title: 'TypeScript First',
    description:
      'Full type safety with TypeScript 5.7+ and strict mode enabled.',
  },
  {
    iconPath: '/Icons/app services/10035-icon-service-App-Services.svg',
    title: 'Modern Stack',
    description:
      'React 19, TanStack Router, Query, and Form for powerful features.',
  },
  {
    iconPath: '/Icons/general/10015-icon-service-Dashboard.svg',
    title: 'Beautiful UI',
    description: 'Pre-styled with shadcn/ui components and Tailwind CSS v4.',
  },
  {
    iconPath: '/Icons/security/10241-icon-service-Microsoft-Defender-for-Cloud.svg',
    title: 'Best Practices',
    description: 'ESLint, Prettier, and testing setup included out of the box.',
  },
  {
    iconPath: '/Icons/networking/10068-icon-service-Virtual-Networks.svg',
    title: 'Production Ready',
    description:
      'Environment management, error boundaries, and deployment configs.',
  },
]

const advancedFeatures = [
  {
    iconPath: '/Icons/analytics/03332-icon-service-Power-BI-Embedded.svg',
    title: 'Analytics Dashboard',
    description:
      'Real-time insights and metrics to track your application performance.',
  },
  {
    iconPath: '/Icons/devops/10261-icon-service-Azure-DevOps.svg',
    title: 'CI/CD Pipeline',
    description:
      'Automated testing and deployment workflows with GitHub Actions.',
  },
  {
    iconPath: '/Icons/security/10245-icon-service-Key-Vaults.svg',
    title: 'Enterprise Security',
    description:
      'Built-in authentication, authorization, and security best practices.',
  },
]

export function FeaturesSection() {
  return (
    <section className="section">
      {/* Wider container for landing section */}
      <div className="mx-auto w-full max-w-[96rem] px-4 sm:px-8 lg:px-12">
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-bold tracking-tight text-[length:var(--font-size-2xl)] sm:text-[length:var(--font-size-3xl)] md:text-[length:var(--font-size-4xl)] leading-tight">
            Everything You Need to Ship Fast
          </h2>
          <p className="mx-auto max-w-2xl text-[length:var(--font-size-base)] sm:text-[length:var(--font-size-lg)] text-muted-foreground leading-relaxed">
            Stop wasting time on configuration. Start building your product with
            our comprehensive toolkit.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            return (
              <Card
                key={feature.title}
                className="group relative overflow-hidden border-muted/50 transition-all hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <CardHeader>
                  <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary p-2">
                    <AzureIcon iconPath={feature.iconPath} />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-20">
          <div className="mb-8 text-center">
            <Badge className="mb-4 px-3 py-1" variant="outline">
              Advanced Features
            </Badge>
            <h3 className="font-bold text-[length:var(--font-size-xl)] sm:text-[length:var(--font-size-2xl)] leading-tight">
              Scale with Confidence
            </h3>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {advancedFeatures.map((feature) => {
              return (
                <div key={feature.title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary p-1.5">
                    <AzureIcon iconPath={feature.iconPath} />
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
