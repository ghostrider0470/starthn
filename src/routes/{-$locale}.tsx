import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import {
  DEFAULT_LOCALE,
  detectPreferredLocale,
  isValidLocale,
  stripLocalePrefix,
  withLocalePath,
} from '@/lib/i18n-utils'
import i18n from '@/i18n'

export const Route = createFileRoute('/{-$locale}')({
  beforeLoad: ({ params, location }) => {
    const localeParam = params.locale
    const hasLocaleParam = typeof localeParam === 'string' && localeParam.length > 0
    const preferredLocale = detectPreferredLocale()
    const resolvedLocale = isValidLocale(localeParam) ? localeParam : preferredLocale

    // Skip locale redirect for auth callback — the redirect corrupts OAuth
    // search params (authorization code, state) via TanStack Router's
    // search serialization. The callback renders fine without a locale prefix.
    const normalizedPath = stripLocalePrefix(location.pathname)
    if (normalizedPath === '/auth/callback') {
      if (i18n.resolvedLanguage !== resolvedLocale) {
        void i18n.changeLanguage(resolvedLocale)
      }
      return { locale: resolvedLocale }
    }

    const hash = typeof location.hash === 'string' ? location.hash : ''
    // Use raw browser search string to preserve unknown params (e.g. OAuth code, state)
    const rawSearch = typeof window !== 'undefined' ? window.location.search : ''
    const search = rawSearch
      ? Object.fromEntries(new URLSearchParams(rawSearch))
      : (location as any).search

    if (hasLocaleParam && !isValidLocale(localeParam)) {
      const restSegments = location.pathname.split('/').filter(Boolean).slice(1)
      const cleanPath = `/${restSegments.join('/')}`.replace(/\/+$/, '') || '/'
      const fallbackPath = withLocalePath(cleanPath, DEFAULT_LOCALE)
      throw redirect({ to: fallbackPath as any, search, hash, replace: true })
    }

    const canonicalPath = withLocalePath(normalizedPath, resolvedLocale)

    if (location.pathname !== canonicalPath) {
      throw redirect({ to: canonicalPath as any, search, hash, replace: true })
    }

    // Sync i18next language with URL
    if (i18n.resolvedLanguage !== resolvedLocale) {
      void i18n.changeLanguage(resolvedLocale)
    }

    return { locale: resolvedLocale }
  },
  component: () => <Outlet />,
})
