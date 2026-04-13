import { useEffect, useRef } from 'react'
import { useLocation } from '@tanstack/react-router'

/**
 * Initialize analytics and track route changes.
 * Call once in RootComponent. Does NOT depend on AuthProvider.
 */
export function useAnalytics(): void {
  const location = useLocation()
  const prevPath = useRef('')

  // Init on mount — dynamic import keeps analytics out of server bundle
  useEffect(() => {
    import('@/lib/analytics').then(({ analytics }) => analytics.init())
  }, [])

  // Track page views on route change
  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname
      import('@/lib/analytics').then(({ analytics }) =>
        analytics.page(location.pathname, document.title),
      )
    }
  }, [location.pathname])
}

/**
 * Identify the current user for analytics. Call inside AuthProvider.
 */
export function useAnalyticsIdentify(user: {
  id: string
  email?: string
  firstName?: string
  lastName?: string
  roles?: string[]
} | null): void {
  useEffect(() => {
    import('@/lib/analytics').then(({ analytics }) => {
      if (user?.id) {
        analytics.identify(user.id, {
          email: user.email ?? '',
          name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
          role: user.roles?.[0] ?? 'user',
        })
      } else {
        analytics.reset()
      }
    })
  }, [user?.id, user?.email, user?.firstName, user?.lastName, user?.roles])
}
