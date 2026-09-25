import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import {
  DEFAULT_LOCALE,
  getLocaleFromPath,
  isValidLocale,
  resolveLocaleAlias,
  stripLocalePrefix,
  withLocalePath,
} from '@/lib/i18n-utils'
import { buildLocalizedSeoHead } from '@/lib/seo'
import i18n, { loadTranslationsForSSR } from '@/i18n'

export const Route = createFileRoute('/{-$locale}')({
  beforeLoad: async ({ params, location }) => {
    const localeParam = params.locale
    const hasLocaleParam =
      typeof localeParam === 'string' && localeParam.length > 0
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const firstPathSegment = pathSegments[0]
    const compoundPathLocale =
      pathSegments.length >= 2 ? `${pathSegments[0]}-${pathSegments[1]}` : ''
    const hasLocaleInPath =
      isValidLocale(firstPathSegment) || isValidLocale(compoundPathLocale)
    const localeFromPath = getLocaleFromPath(location.pathname)
    // No browser-language sniffing: a URL without a locale prefix always
    // means the default (Bosnian). That keeps every redirect deterministic, so
    // crawlers and visitors see the same thing and the redirect can be a 301.
    const resolvedLocale = hasLocaleInPath
      ? localeFromPath
      : isValidLocale(localeParam)
        ? localeParam
        : DEFAULT_LOCALE

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
    const rawSearch =
      typeof window !== 'undefined' ? window.location.search : ''
    const search = rawSearch
      ? Object.fromEntries(new URLSearchParams(rawSearch))
      : (location as any).search

    // Every redirect below depends only on the URL, so make it permanent:
    // Google then consolidates signals onto the target instead of treating the
    // prefix-less URL as a separate page stuck in "Page with redirect".
    if (hasLocaleParam && !isValidLocale(localeParam)) {
      // A near-miss locale keeps its language ("/en/services" → "/en-US/services");
      // anything else is dropped and falls back to the default locale.
      const aliasLocale = resolveLocaleAlias(localeParam)
      const restSegments = location.pathname.split('/').filter(Boolean).slice(1)
      const cleanPath = `/${restSegments.join('/')}`.replace(/\/+$/, '') || '/'
      const fallbackPath = withLocalePath(cleanPath, aliasLocale ?? DEFAULT_LOCALE)
      throw redirect({
        to: fallbackPath as any,
        search,
        hash,
        replace: true,
        statusCode: 301,
      })
    }

    const canonicalPath = withLocalePath(normalizedPath, resolvedLocale)

    if (location.pathname !== canonicalPath) {
      throw redirect({
        to: canonicalPath as any,
        search,
        hash,
        replace: true,
        statusCode: 301,
      })
    }

    // Load translations for SSR (no-op on client — fetch backend handles it)
    await loadTranslationsForSSR(resolvedLocale)

    // Sync i18next language with URL
    if (i18n.resolvedLanguage !== resolvedLocale) {
      await i18n.changeLanguage(resolvedLocale)
    }

    return { locale: resolvedLocale }
  },
  // Server-render per-page canonical / og:url / hreflang. This layout route is
  // on the path of every localized page, and its loader receives the full
  // `location`, so it's the single place that can compute these correctly during
  // SSR (the static root head() has no locale or path). On the client, the same
  // signals are kept in sync on navigation by useI18nMeta (it upserts the same
  // tags, so there's no duplication).
  loader: ({ context, location }) => {
    const normalizedPath = stripLocalePrefix(location.pathname)
    return { seoHead: buildLocalizedSeoHead(normalizedPath, context.locale) }
  },
  head: ({ loaderData }) => {
    const seoHead = loaderData?.seoHead
    if (!seoHead) return {}
    return {
      meta: [
        { name: 'robots', content: seoHead.robots },
        { property: 'og:url', content: seoHead.canonicalUrl },
        { name: 'twitter:url', content: seoHead.canonicalUrl },
      ],
      links: [
        { rel: 'canonical', href: seoHead.canonicalUrl },
        ...seoHead.alternates.map((alt) => ({
          rel: 'alternate',
          hreflang: alt.hreflang,
          href: alt.href,
        })),
      ],
    }
  },
  component: () => <Outlet />,
})
