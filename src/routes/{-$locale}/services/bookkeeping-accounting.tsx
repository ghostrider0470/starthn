import { createFileRoute } from '@tanstack/react-router'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'
import { localizedServiceHead } from '@/lib/seo-meta'

export const Route = createFileRoute(
  '/{-$locale}/services/bookkeeping-accounting',
)({
  head: ({ params }) => localizedServiceHead('bookkeeping', params.locale),
  component: BookkeepingAccounting,
})

function BookkeepingAccounting() {
  return <ServicePageTemplate serviceId="bookkeeping" />
}
