import { createFileRoute } from '@tanstack/react-router'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'
import { localizedServiceHead } from '@/lib/seo-meta'

export const Route = createFileRoute('/{-$locale}/services/virtual-cfo')({
  head: ({ params }) => localizedServiceHead('virtualCfo', params.locale),
  component: VirtualCfo,
})

function VirtualCfo() {
  return <ServicePageTemplate serviceId="virtualCfo" />
}
