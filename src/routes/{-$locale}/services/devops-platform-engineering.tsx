import { createFileRoute } from '@tanstack/react-router'
import { Gauge, GitBranch, Workflow } from 'lucide-react'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'

export const Route = createFileRoute(
  '/{-$locale}/services/devops-platform-engineering',
)({
  component: DevOpsPlatformEngineering,
})

const icons = [
  GitBranch,
  Workflow,
  Gauge,
]

function DevOpsPlatformEngineering() {
  return <ServicePageTemplate serviceKey="devops" icons={icons} />
}
