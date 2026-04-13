import { createFileRoute, redirect } from '@tanstack/react-router'
import { DEFAULT_LOCALE, isValidLocale, withLocalePath } from '@/lib/i18n-utils'

export const Route = createFileRoute('/{-$locale}/workspace')({
  ssr: false,
  beforeLoad: ({ params }) => {
    const currentLocale = isValidLocale(params.locale) ? params.locale : DEFAULT_LOCALE
    throw redirect({
      to: withLocalePath('/profile', currentLocale),
      replace: true,
    })
  },
  component: LegacyWorkspaceRoute,
})

function LegacyWorkspaceRoute() {
  return null
}
