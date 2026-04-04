import { createFileRoute } from '@tanstack/react-router'
import { NotFoundPage } from '@/components/errors/NotFoundPage'

export const Route = createFileRoute('/{-$locale}/404')({
  component: NotFoundPage,
})
