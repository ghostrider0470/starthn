import { createFileRoute } from '@tanstack/react-router'
import { CloudCog, Network, Server } from 'lucide-react'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'

export const Route = createFileRoute('/{-$locale}/services/cloud-architecture')(
  {
    head: () => ({
      meta: [
        { title: 'Cloud Architecture — Start HN' },
        {
          name: 'description',
          content:
            'Cloud architecture, migration, and cloud-native platform engineering by Start HN.',
        },
        { property: 'og:title', content: 'Cloud Architecture — Start HN' },
        {
          property: 'og:description',
          content:
            'Cloud architecture, migration, and cloud-native platform engineering by Start HN.',
        },
      ],
    }),
    component: CloudArchitecture,
  },
)

const icons = [
  CloudCog,
  Network,
  Server,
]

function CloudArchitecture() {
  return <ServicePageTemplate serviceKey="cloud" icons={icons} />
}
