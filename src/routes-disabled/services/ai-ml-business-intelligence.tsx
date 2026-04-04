import { createFileRoute } from '@tanstack/react-router'
import { BrainCircuit, ChartColumnIncreasing, Database } from 'lucide-react'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'

export const Route = createFileRoute(
  '/{-$locale}/services/ai-ml-business-intelligence',
)({
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
