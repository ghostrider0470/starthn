import { createFileRoute, notFound } from '@tanstack/react-router'

// The team page is disabled. A real 404 (not a temporary redirect to the
// homepage) tells crawlers the URL has no content of its own.
export const Route = createFileRoute('/{-$locale}/team/')({
  beforeLoad: () => {
    throw notFound()
  },
  component: () => null,
})
