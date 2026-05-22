import { createFileRoute } from '@tanstack/react-router'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'

export const Route = createFileRoute('/{-$locale}/services/virtual-cfo')({
  head: () => ({
    meta: [
      { title: 'Virtual CFO Services — Start HN' },
      {
        name: 'description',
        content:
          'Virtual CFO services for growing businesses in BiH. Financial analysis, cash flow planning, and strategic advisory on a flexible retainer.',
      },
      {
        property: 'og:title',
        content: 'Virtual CFO Services — Start HN',
      },
      {
        property: 'og:description',
        content:
          'Virtual CFO services for growing businesses in BiH. Financial analysis, cash flow planning, and strategic advisory on a flexible retainer.',
      },
    ],
  }),
  component: VirtualCfo,
})

function VirtualCfo() {
  return <ServicePageTemplate serviceId="virtualCfo" />
}
