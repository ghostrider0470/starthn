import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  DEFAULT_LOCALE,
  isValidLocale,
  withLocalePath,
} from '@/lib/i18n-utils'
import { SERVICE_ROUTES } from '@/lib/service-routes'

export const Route = createFileRoute(
  '/{-$locale}/services/ai-ml-business-intelligence',
)({
  beforeLoad: ({ params }) => {
    const locale = isValidLocale(params.locale) ? params.locale : DEFAULT_LOCALE
    throw redirect({
      to: withLocalePath(SERVICE_ROUTES.taxConsulting, locale) as never,
      replace: true,
    })
  },
  component: LegacyServiceRoute,
})

function LegacyServiceRoute() {
  return null
}
