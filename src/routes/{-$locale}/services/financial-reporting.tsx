import { createFileRoute } from '@tanstack/react-router'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'

export const Route = createFileRoute('/{-$locale}/services/financial-reporting')(
  {
    head: () => ({
      meta: [
        { title: 'Financial Reporting — Start HN' },
        {
          name: 'description',
          content:
            'Accurate statutory financial reports, management reporting, and analysis for business decisions with Start HN.',
        },
        { property: 'og:title', content: 'Financial Reporting — Start HN' },
        {
          property: 'og:description',
          content:
            'Accurate statutory financial reports, management reporting, and analysis for business decisions with Start HN.',
        },
      ],
    }),
    component: FinancialReporting,
  },
)

function FinancialReporting() {
  return <ServicePageTemplate serviceId="financialReporting" />
}
