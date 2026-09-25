import { createFileRoute } from '@tanstack/react-router'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'
import { localizedServiceHead } from '@/lib/seo-meta'

export const Route = createFileRoute('/{-$locale}/services/tax-consulting')({
  head: ({ params }) => localizedServiceHead('taxConsulting', params.locale),
  component: TaxConsulting,
})

function TaxConsulting() {
  return <ServicePageTemplate serviceId="taxConsulting" />
}
