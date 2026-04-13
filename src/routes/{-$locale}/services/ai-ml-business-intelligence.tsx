import { createFileRoute } from '@tanstack/react-router'
import { BrainCircuit, ChartColumnIncreasing, Database } from 'lucide-react'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'

export const Route = createFileRoute(
  '/{-$locale}/services/ai-ml-business-intelligence',
)({
  head: () => ({
    meta: [
      { title: 'AI & Machine Learning — Start HN' },
      {
        name: 'description',
        content:
          'AI, machine learning, and business intelligence solutions by Start HN. From predictive analytics to intelligent automation.',
      },
      {
        property: 'og:title',
        content: 'AI & Machine Learning — Start HN',
      },
      {
        property: 'og:description',
        content:
          'AI, machine learning, and business intelligence solutions by Start HN. From predictive analytics to intelligent automation.',
      },
    ],
  }),
  component: AIMLBusinessIntelligence,
})

const icons = [
  BrainCircuit,
  Database,
  ChartColumnIncreasing,
]

function AIMLBusinessIntelligence() {
  return <ServicePageTemplate serviceKey="aiml" icons={icons} />
}
