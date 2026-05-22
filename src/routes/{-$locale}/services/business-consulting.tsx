import { createFileRoute } from '@tanstack/react-router'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'

export const Route = createFileRoute('/{-$locale}/services/business-consulting')(
  {
    head: () => ({
      meta: [
        { title: 'Business Consulting — Start HN' },
        {
          name: 'description',
          content:
            'Practical business consulting for structure, growth, financial decisions, and operational clarity with Start HN.',
        },
        { property: 'og:title', content: 'Business Consulting — Start HN' },
        {
          property: 'og:description',
          content:
            'Practical business consulting for structure, growth, financial decisions, and operational clarity with Start HN.',
        },
      ],
    }),
    component: BusinessConsulting,
  },
)

function BusinessConsulting() {
  return <ServicePageTemplate serviceId="businessConsulting" />
}
