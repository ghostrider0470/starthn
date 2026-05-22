import { createFileRoute } from '@tanstack/react-router'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'

export const Route = createFileRoute('/{-$locale}/services/tax-consulting')({
  head: () => ({
    meta: [
      { title: 'Tax Monitoring & Advisory — Start HN' },
      {
        name: 'description',
        content:
          'Expert tax monitoring and advisory services in BiH. Start HN tracks your obligations, files on time, and optimises your tax position.',
      },
      {
        property: 'og:title',
        content: 'Tax Monitoring & Advisory — Start HN',
      },
      {
        property: 'og:description',
        content:
          'Expert tax monitoring and advisory services in BiH. Start HN tracks your obligations, files on time, and optimises your tax position.',
      },
    ],
  }),
  component: TaxConsulting,
})

function TaxConsulting() {
  return <ServicePageTemplate serviceId="taxConsulting" />
}
