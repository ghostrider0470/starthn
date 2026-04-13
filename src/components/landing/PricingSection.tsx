import { Check, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const plans = [
  {
    name: 'Starter',
    price: '€99',
    period: '/month',
    description: 'For startups and individual developers',
    features: [
      'Project dashboard access',
      'Up to 3 active projects',
      'Basic analytics & reporting',
      'Community support',
      'Email support',
      'Knowledge base access',
    ],
    notIncluded: ['Team collaboration', 'Custom integrations', 'API access'],
    cta: 'Start Free Trial',
    variant: 'outline' as const,
  },
  {
    name: 'Professional',
    price: '€399',
    period: '/month',
    description: 'For growing teams and SMBs',
    badge: 'Most Popular',
    features: [
      'Everything in Starter',
      'Up to 10 team members',
      'Team collaboration tools',
      'Advanced analytics & dashboards',
      'Custom integrations',
      'Priority support',
      'Monthly strategy sessions',
      'CI/CD pipeline templates',
    ],
    notIncluded: ['API access', 'White labeling'],
    cta: 'Start 14-Day Trial',
    variant: 'default' as const,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations with complex needs',
    features: [
      'Everything in Professional',
      'Unlimited team members',
      'Full API access',
      'Custom workflows & automation',
      'White labeling options',
      'Dedicated account manager',
      'On-site workshops',
      'SLA guarantee',
      'Compliance & security audits',
    ],
    notIncluded: [],
    cta: 'Contact Sales',
    variant: 'outline' as const,
  },
]

export function PricingSection() {
  return (
    <section className="section">
      {/* Wider container for landing section */}
      <div className="mx-auto w-full max-w-[96rem] px-4 sm:px-8 lg:px-12">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Our Pricing Plans
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Scalable plans for teams and organizations of all sizes
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative overflow-hidden ${
                plan.badge ? 'border-primary shadow-lg' : 'border-muted/50'
              }`}
            >
              {plan.badge && (
                <div className="absolute right-0 top-0">
                  <Badge className="rounded-bl-lg rounded-br-none rounded-tl-none rounded-tr-md px-3 py-1">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  {plan.notIncluded.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-2 opacity-50"
                    >
                      <X className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="text-sm line-through">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter>
                <Button className="w-full" variant={plan.variant}>
                  {plan.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 rounded-lg bg-secondary/50 p-8 text-center">
          <h3 className="mb-2 text-xl font-semibold">Need something custom?</h3>
          <p className="mb-4 text-muted-foreground">
            We can help you build exactly what you need. Let's discuss your
            requirements.
          </p>
          <Button variant="outline">Schedule a Call</Button>
        </div>
      </div>
    </section>
  )
}
