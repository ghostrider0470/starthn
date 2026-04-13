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
  head: () => ({
    meta: [
      { title: 'Enterprise Software Development — Start HN' },
      {
        name: 'description',
        content:
          'Custom enterprise software development by Start HN. Scalable, secure, and production-grade applications built to last.',
      },
      {
        property: 'og:title',
        content: 'Enterprise Software Development — Start HN',
      },
      {
        property: 'og:description',
        content:
          'Custom enterprise software development by Start HN. Scalable, secure, and production-grade applications built to last.',
      },
    ],
  }),
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
