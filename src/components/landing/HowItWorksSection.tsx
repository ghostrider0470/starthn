import { Download, Wrench, Rocket, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const steps = [
  {
    number: '01',
    icon: Download,
    title: 'Clone the Repository',
    description:
      'Get started in seconds with a simple git clone command. All dependencies and configurations are ready to go.',
    code: 'git clone https://github.com/ghostrider0470/starthn',
  },
  {
    number: '02',
    icon: Wrench,
    title: 'Install & Configure',
    description:
      'Run npm install and customize the configuration to match your project needs. Everything is pre-configured for optimal development.',
    code: 'npm install && npm run dev',
  },
  {
    number: '03',
    icon: Rocket,
    title: 'Start Building',
    description:
      'Begin developing immediately with hot reload, TypeScript support, and all modern tooling at your fingertips.',
    code: '// Start coding your amazing app!',
  },
  {
    number: '04',
    icon: CheckCircle,
    title: 'Deploy to Production',
    description:
      'Deploy to your favorite platform with optimized builds, environment management, and production-ready configurations.',
    code: 'npm run build && npm run deploy',
  },
]

export function HowItWorksSection() {
  return (
    <section className="section">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <Badge variant="outline" className="mb-4">
            Simple Setup
          </Badge>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Get Started in Minutes
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            From zero to production in four simple steps. No complex
            configuration needed.
          </p>
        </div>

        <div className="relative">
          {/* Connection line for desktop */}
          <div className="absolute left-1/2 top-0 hidden h-full w-0.5 -translate-x-1/2 bg-gradient-to-b from-primary/20 via-primary/50 to-primary/20 lg:block" />

          <div className="space-y-12 lg:space-y-24">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isEven = index % 2 === 0

              return (
                <div key={step.number} className="relative">
                  <div
                    className={`flex flex-col gap-8 lg:flex-row lg:items-center ${isEven ? '' : 'lg:flex-row-reverse'}`}
                  >
                    {/* Content */}
                    <div className="flex-1">
                      <div
                        className={`lg:max-w-lg ${isEven ? 'lg:ml-auto lg:pr-12' : 'lg:mr-auto lg:pl-12'}`}
                      >
                        <Badge variant="secondary" className="mb-4">
                          Step {step.number}
                        </Badge>
                        <h3 className="mb-3 text-2xl font-bold">
                          {step.title}
                        </h3>
                        <p className="mb-4 text-muted-foreground">
                          {step.description}
                        </p>
                        <div className="rounded-lg bg-secondary/50 p-4">
                          <code className="text-sm text-primary">
                            {step.code}
                          </code>
                        </div>
                      </div>
                    </div>

                    {/* Icon circle */}
                    <div className="relative z-10 mx-auto lg:mx-0">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-lg">
                        <Icon className="h-10 w-10" />
                      </div>
                    </div>

                    {/* Placeholder for layout balance */}
                    <div className="hidden flex-1 lg:block" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="mb-6 text-lg text-muted-foreground">
            Ready to accelerate your development?
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg">View Documentation</Button>
            <Button size="lg" variant="outline">
              Watch Video Tutorial
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

import { Button } from '@/components/ui/button'
