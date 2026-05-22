import { createFileRoute } from '@tanstack/react-router'
import { ServicePageTemplate } from '@/components/services/ServicePageTemplate'

export const Route = createFileRoute(
  '/{-$locale}/services/bookkeeping-accounting',
)({
  head: () => ({
    meta: [
      { title: 'Bookkeeping & Accounting Services — Start HN' },
      {
        name: 'description',
        content:
          'Professional bookkeeping and accounting services in BiH. Start HN manages your books precisely and on time — for sole traders and companies.',
      },
      {
        property: 'og:title',
        content: 'Bookkeeping & Accounting Services — Start HN',
      },
      {
        property: 'og:description',
        content:
          'Professional bookkeeping and accounting services in BiH. Start HN manages your books precisely and on time — for sole traders and companies.',
      },
    ],
  }),
  component: BookkeepingAccounting,
})

function BookkeepingAccounting() {
  return <ServicePageTemplate serviceId="bookkeeping" />
}
