import { createFileRoute, redirect } from '@tanstack/react-router'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

export const Route = createFileRoute('/{-$locale}/team/')({
  beforeLoad: ({ location }) => {
    const locale = getLocaleFromPath(location.pathname)
    throw redirect({ to: withLocalePath('/', locale) })
  },
  component: () => null,
})
