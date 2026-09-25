import { createFileRoute } from '@tanstack/react-router'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'
import { localizedServiceHead } from '@/lib/seo-meta'

export const Route = createFileRoute('/{-$locale}/services/business-consulting')(
  {
    head: ({ params }) => localizedServiceHead('businessConsulting', params.locale),
    component: BusinessConsulting,
  },
)

function BusinessConsulting() {
  return <ServicePageTemplate serviceId="businessConsulting" />
}
