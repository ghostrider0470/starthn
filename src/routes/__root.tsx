import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useLocation,
  useRouterState,
} from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { Suspense, lazy, useEffect, useState } from 'react'

import { useTranslation } from 'react-i18next'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { MobileBottomNav } from '../components/MobileBottomNav'
import { useI18nMeta } from '../hooks/useI18nMeta'
import { useAnalytics } from '../hooks/useAnalytics'

import type { QueryClient } from '@tanstack/react-query'
import type AppI18n from '@/i18n'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/contexts/AuthContext'
import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary'
import { AppErrorBoundary } from '@/components/errors/AppErrorBoundary'
import { LoadingState } from '@/components/layout/LoadingState'
import { OfflineFallback } from '@/components/layout/OfflineFallback'
import { Toaster } from '@/components/ui/toaster'
import { CookieConsent } from '@/components/CookieConsent'
import { ChatProvider } from '@/contexts/ChatContext'

import appCss from '@/styles.css?url'
import { getLocaleDir, getLocaleFromPath } from '@/lib/i18n-utils'
import { buildLocalBusinessStructuredData, jsonLd } from '@/lib/seo'
import { resolveSeoStrings } from '@/lib/seo-meta'

// Lazy-load browser-only components that use useIsDarkMode / document APIs
const ChatWidget = lazy(() =>
  import('@/components/chat/ChatWidget').then((m) => ({
    default: m.ChatWidget,
  })),
)
const NotFoundPage = lazy(() =>
  import('@/components/errors/NotFoundPage').then((m) => ({
    default: m.NotFoundPage,
  })),
)

// Dev-only: lazy-load devtools so they are tree-shaken from production builds
const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-router-devtools').then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    )
  : () => null

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({
        default: m.ReactQueryDevtools,
      })),
    )
  : () => null

interface MyRouterContext {
  queryClient: QueryClient
  /**
   * This request's i18next instance: a per-request clone during SSR, the
   * singleton on the client (see getRouter()). Server code switches the
   * language on this, never on the shared singleton.
   */
  i18n: typeof AppI18n
}

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

function RootComponent() {
  useI18nMeta()
  useAnalytics()
  const { t } = useTranslation()
  const location = useLocation()
  const isOnline = useOnlineStatus()
  const { queryClient } = Route.useRouteContext()

  const isAdminRoute = /\/admin(\/|$)/.test(location.pathname)

  const content = isAdminRoute ? (
    <>
      <Outlet />
      <Toaster />
    </>
  ) : (
    <ChatProvider>
      <div className="min-h-screen flex flex-col relative">
        <a href="#main-content" className="skip-link">
          {t('nav.skipToContent')}
        </a>
        <Navbar />
        <main
          id="main-content"
          tabIndex={-1}
          className="relative flex-1 overflow-x-hidden pt-16 pb-8 md:pb-0"
        >
          <Outlet />
        </main>
        <Footer />
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
        <div
          aria-hidden
          className="h-[calc(6.75rem+env(safe-area-inset-bottom))] md:hidden"
        />
        <MobileBottomNav />
      </div>
    </ChatProvider>
  )

  return (
    <ThemeProvider defaultTheme="system" storageKey="starthn-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppErrorBoundary>
            {!isOnline && <OfflineFallback />}
            <Suspense
              fallback={
                isOnline ? (
                  <LoadingState fullPage message="Loading Start HN..." />
                ) : (
                  <OfflineFallback fullPage />
                )
              }
            >
              {content}
            </Suspense>
            {/* Analytics consent (decision D4): GA4 and Clarity load only after
                an explicit "Accept". Renders nothing during SSR. */}
            <CookieConsent />
          </AppErrorBoundary>
        </AuthProvider>
        <Suspense fallback={null}>
          {/* <TanStackRouterDevtools />*/}
          {/* <ReactQueryDevtools buttonPosition="bottom-right" />*/}
        </Suspense>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

// Blocking inline script that applies the theme class before first paint,
// eliminating the light→dark CLS flash that happens when ThemeProvider's
// useEffect runs after hydration.
const THEME_INIT_SCRIPT = `(function(){var t=localStorage.getItem('starthn-theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.classList.toggle('light',!d);document.documentElement.style.colorScheme=d?'dark':'light'})()`

function RootDocument({ children }: { children: React.ReactNode }) {
  // lang/dir come from the URL, not from i18next state: the URL is the one
  // per-request signal that can't be changed by a concurrent SSR request, and
  // it is identical on the server and the client. Full BCP-47 code (bs-BA,
  // sr-Latn, zh-Hans) and dir="rtl" for ar-SA.
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const locale = getLocaleFromPath(pathname)
  return (
    <html lang={locale} dir={getLocaleDir(locale)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

/** The URL locale of the current matches ({-$locale} param), or the default. */
function localeFromMatches(
  matches: ReadonlyArray<{ params?: unknown }>,
): string | undefined {
  for (const m of matches) {
    const locale = (m.params as { locale?: unknown } | undefined)?.locale
    if (typeof locale === 'string' && locale) return locale
  }
  return undefined
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  // Site-wide defaults. Every public page's own head() (see
  // src/lib/seo-meta.ts) overrides the title, description and og/twitter
  // strings, and the {-$locale} layout adds canonical, hreflang, robots,
  // og:url and og:locale. For a 404 (globalNotFound) only this head() runs
  // on the server, so it carries the localized 404 title and noindex.
  head: ({ match, matches }) => {
    const locale = localeFromMatches(matches)
    const isNotFound = match.globalNotFound === true
    const site = resolveSeoStrings('default', locale)
    const page = isNotFound ? resolveSeoStrings('notFound', locale) : site
    return {
      meta: [
        { charSet: 'utf-8' },
        {
          name: 'viewport',
          content:
            'width=device-width, initial-scale=1, interactive-widget=resizes-content',
        },
        { name: 'theme-color', content: '#E6CE82' },
        { title: page.title },
        { name: 'description', content: page.description },
        {
          name: 'keywords',
          content:
            'računovodstvo, knjigovodstvo, porezno savjetovanje, virtualni CFO, finansijsko izvještavanje, Sarajevo, Ilidža, Bosna i Hercegovina',
        },
        { name: 'author', content: 'Start HN' },
        { name: 'robots', content: isNotFound ? 'noindex,follow' : 'index,follow' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Start HN' },
        { property: 'og:title', content: page.title },
        { property: 'og:description', content: page.description },
        {
          property: 'og:image',
          content: 'https://www.starthn.ba/og-image.png',
        },
        { property: 'og:image:alt', content: site.title },
        // og:url, og:locale, twitter:url, canonical and hreflang are
        // server-rendered per page by the {-$locale} layout route (see its
        // head()), which knows the locale and full path.
        { name: 'twitter:card', content: 'summary_large_image' },
        {
          name: 'twitter:image',
          content: 'https://www.starthn.ba/og-image.png',
        },
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icon-192.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.json' },
      ],
      scripts: [jsonLd(buildLocalBusinessStructuredData())],
    }
  },
  shellComponent: RootDocument,
  component: RootComponent,
  notFoundComponent: () => (
    <Suspense fallback={<LoadingState fullPage message="Loading..." />}>
      <NotFoundPage />
    </Suspense>
  ),
  errorComponent: RouteErrorBoundary,
})
