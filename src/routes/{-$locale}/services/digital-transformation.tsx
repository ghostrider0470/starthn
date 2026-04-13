import { createFileRoute } from '@tanstack/react-router'
import { ChartNoAxesCombined, Landmark, Target } from 'lucide-react'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'

export const Route = createFileRoute(
  '/{-$locale}/services/digital-transformation',
)({
  head: () => ({
    meta: [
      { title: 'Digital Transformation — Start HN' },
      {
        name: 'description',
        content:
          'Digital transformation consulting and implementation by Start HN. Modernize your business with enterprise technology.',
      },
      {
        property: 'og:title',
        content: 'Digital Transformation — Start HN',
      },
      {
        property: 'og:description',
        content:
          'Digital transformation consulting and implementation by Start HN. Modernize your business with enterprise technology.',
      },
    ],
  }),
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
