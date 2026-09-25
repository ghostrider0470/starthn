import { createFileRoute } from '@tanstack/react-router'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'
import { localizedServiceHead } from '@/lib/seo-meta'

export const Route = createFileRoute('/{-$locale}/services/financial-reporting')(
  {
    head: ({ params }) => localizedServiceHead('financialReporting', params.locale),
    component: FinancialReporting,
  },
)

function FinancialReporting() {
  return <ServicePageTemplate serviceId="financialReporting" />
}
