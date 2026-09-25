import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import {
  DEFAULT_LOCALE,
  getLocaleFromPath,
  isValidLocale,
  resolveLocaleAlias,
  stripLocalePrefix,
  withLocalePath,
} from '@/lib/i18n-utils'
import {
  buildBreadcrumbTrail,
  buildLocalizedSeoHead,
  isPrivateRoute,
  jsonLd,
} from '@/lib/seo'
import { ensureSeoFallbackForSSR, translateExact } from '@/lib/seo-meta'
import { loadTranslationsForSSR } from '@/i18n'

const BLOG_POST_PATH = /^\/blog\/([^/]+)$/

export const Route = createFileRoute('/{-$locale}')({
  // Language switches go through `context.i18n` (this request's instance, see
  // getRouter()), never the module-level singleton that concurrent SSR
  // requests share.
  beforeLoad: async ({ params, location, context }) => {
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
      await loadTranslationsForSSR(resolvedLocale)
      await ensureSeoFallbackForSSR(resolvedLocale)
      if (context.i18n.language !== resolvedLocale) {
        await context.i18n.changeLanguage(resolvedLocale)
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
      // A near-miss locale keeps its language and loses the alias segment
      // ("/en/services" → "/en-US/services"). Any other first segment is NOT a
      // locale, so the full path is kept under the default locale
      // ("/zzqqxx" → "/bs-BA/zzqqxx"): it then ends at a real 404 instead of
      // being silently turned into the homepage (a soft 404). The server
      // canonical middleware handles this during SSR; this is the client-side
      // defence.
      const aliasLocale = resolveLocaleAlias(localeParam)
      let fallbackPath: string
      if (aliasLocale) {
        const restSegments = location.pathname.split('/').filter(Boolean).slice(1)
        const cleanPath = `/${restSegments.join('/')}`.replace(/\/+$/, '') || '/'
        fallbackPath = withLocalePath(cleanPath, aliasLocale)
      } else {
        fallbackPath = withLocalePath(
          location.pathname.replace(/\/+$/, '') || '/',
          DEFAULT_LOCALE,
        )
      }
      throw redirect({
        to: fallbackPath as any,
        search,
        hash,
        replace: true,
        statusCode: 301,
      })
    }

    // Public paths are canonical in lowercase (/bs-BA/ABOUT → /bs-BA/about);
    // private routes are left alone. The query is never touched.
    const canonicalPath = withLocalePath(
      isPrivateRoute(normalizedPath) ? normalizedPath : normalizedPath.toLowerCase(),
      resolvedLocale,
    )

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
    // Fill SEO strings this locale is missing from its fallback language, so
    // head() never renders a raw key and the dehydrated store matches SSR.
    await ensureSeoFallbackForSSR(resolvedLocale)

    // Sync this request's i18next language with the URL
    if (context.i18n.language !== resolvedLocale) {
      await context.i18n.changeLanguage(resolvedLocale)
    }

    return { locale: resolvedLocale }
  },
  // Server-render per-page canonical / og:url / og:locale / hreflang / robots
  // and the BreadcrumbList. This layout route is on the path of every
  // localized page, and its loader receives the full `location`, so it's the
  // single place that can compute these correctly during SSR (the static root
  // head() has no locale or path). Titles and descriptions come from each
  // page's own head() (src/lib/seo-meta.ts).
  loader: async ({ context, location }) => {
    const normalizedPath = stripLocalePrefix(location.pathname)
    const blogSlug = BLOG_POST_PATH.exec(normalizedPath)?.[1]

    // A post lists in hreflang only the languages it exists in. null (client
    // navigation, no D1) means "unknown": no filter.
    let allowedLocales: Array<string> | null = null
    if (blogSlug) {
      try {
        // Imported on demand so this layout (part of every page's main
        // chunk) does not pull in the D1 data module.
        const { ssrBlogPostLocales } = await import('@/server/ssr-data')
        allowedLocales = await ssrBlogPostLocales(decodeURIComponent(blogSlug))
      } catch {
        allowedLocales = null
      }
    }

    return {
      seoHead: buildLocalizedSeoHead(
        normalizedPath,
        context.locale,
        allowedLocales,
      ),
      // Blog posts emit their own BreadcrumbList (last item = post title).
      breadcrumbs: blogSlug
        ? null
        : buildBreadcrumbTrail(normalizedPath, context.locale, (key) =>
            translateExact(context.locale, 'common', key),
          ),
    }
  },
  head: ({ loaderData, matches }) => {
    // A 404 is rendered by the root route, whose head() carries the 404
    // title and noindex; on the server only that head() runs, so emit
    // nothing here either (keeps the hydration re-run identical).
    if (matches[0]?.globalNotFound) return {}
    const seoHead = loaderData?.seoHead
    if (!seoHead) return {}
    return {
      meta: [
        { name: 'robots', content: seoHead.robots },
        { property: 'og:url', content: seoHead.canonicalUrl },
        { property: 'og:locale', content: seoHead.ogLocale },
        { name: 'twitter:url', content: seoHead.canonicalUrl },
      ],
      links: [
        { rel: 'canonical', href: seoHead.canonicalUrl },
        ...seoHead.alternates.map((alt) => ({
          rel: 'alternate',
          // React's prop name; it renders as the hreflang attribute.
          hrefLang: alt.hreflang,
          href: alt.href,
        })),
      ],
      scripts: loaderData.breadcrumbs ? [jsonLd(loaderData.breadcrumbs)] : [],
    }
  },
  component: () => <Outlet />,
})
