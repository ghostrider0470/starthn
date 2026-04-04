import { createFileRoute } from '@tanstack/react-router'
import {
  DatabaseZap,
  LayoutDashboard,
  Workflow,
} from 'lucide-react'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'

export const Route = createFileRoute(
  '/{-$locale}/services/enterprise-software-development',
)({
  component: EnterpriseSoftwareDevelopment,
})

const icons = [
  LayoutDashboard,
  Workflow,
  DatabaseZap,
]

function EnterpriseSoftwareDevelopment() {
  return <ServicePageTemplate serviceKey="enterprise" icons={icons} />
}
