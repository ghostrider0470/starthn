import { createFileRoute, redirect } from '@tanstack/react-router'
import { FirstTimeSetup } from '@/components/FirstTimeSetup'
import authService from '@/services/auth.service'
import { DEFAULT_LOCALE, isValidLocale, withLocalePath } from '@/lib/i18n-utils'

export const Route = createFileRoute('/{-$locale}/first-time-setup')({
  beforeLoad: ({ params }) => {
    const currentLocale = isValidLocale(params.locale) ? params.locale : DEFAULT_LOCALE

    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      throw redirect({
        to: withLocalePath('/login', currentLocale),
        search: {
          // @ts-ignore
      redirect:  withLocalePath('/first-time-setup', currentLocale),
        }
      })
    }
    
    // Check if user has already completed setup
    const token = authService.getAccessToken()
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (!payload.is_first_time_setup) {
          // User has already completed setup, redirect to profile
          throw redirect({
            to: withLocalePath('/profile', currentLocale),
          })
        }
      } catch (error) {
        console.error('Failed to decode token:', error)
      }
    }
  },
  component: FirstTimeSetupPage,
})

function FirstTimeSetupPage() {
  return <FirstTimeSetup />
}
