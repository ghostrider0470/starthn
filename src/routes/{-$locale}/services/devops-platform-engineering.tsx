import { createFileRoute } from '@tanstack/react-router'
import { Gauge, GitBranch, Workflow } from 'lucide-react'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'

export const Route = createFileRoute(
  '/{-$locale}/services/devops-platform-engineering',
)({
  head: () => ({
    meta: [
      { title: 'DevOps & Platform Engineering — Horizon Tech' },
      {
        name: 'description',
        content:
          'DevOps and platform engineering services by Horizon Tech. CI/CD pipelines, infrastructure as code, and scalable delivery platforms.',
      },
      {
        property: 'og:title',
        content: 'DevOps & Platform Engineering — Horizon Tech',
      },
      {
        property: 'og:description',
        content:
          'DevOps and platform engineering services by Horizon Tech. CI/CD pipelines, infrastructure as code, and scalable delivery platforms.',
      },
    ],
  }),
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
