import { createFileRoute, notFound } from '@tanstack/react-router'
import { NotFoundPage } from '@/components/errors/NotFoundPage'

export const Route = createFileRoute('/{-$locale}/$')({
  // Throwing notFound() (rather than just rendering NotFoundPage) makes the
  // SSR response a real 404 instead of a soft 404 with status 200.
  beforeLoad: () => {
    throw notFound()
  },
  component: NotFoundPage,
})
