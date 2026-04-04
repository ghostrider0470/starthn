import { createFileRoute } from '@tanstack/react-router'
import { CloudCog, Network, Server } from 'lucide-react'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'

export const Route = createFileRoute('/{-$locale}/services/cloud-architecture')(
  {
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
