import { createFileRoute } from '@tanstack/react-router'
import { ChartNoAxesCombined, Landmark, Target } from 'lucide-react'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'

export const Route = createFileRoute(
  '/{-$locale}/services/digital-transformation',
)({
  component: DigitalTransformation,
})

const icons = [
  Target,
  ChartNoAxesCombined,
  Landmark,
]

function DigitalTransformation() {
  return <ServicePageTemplate serviceKey="digital" icons={icons} />
}
