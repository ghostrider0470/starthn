import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useLocation,
} from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useState } from 'react'

import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { MobileBottomNav } from '../components/MobileBottomNav'
import { useI18nMeta } from '../hooks/useI18nMeta'
import { useAnalytics } from '../hooks/useAnalytics'
import { useTranslation } from 'react-i18next'

import { ThemeProvider } from '@/components/theme-provider'
import { CRTSoundProvider } from '@/hooks/useCRTSound'
import { AuthProvider } from '@/contexts/AuthContext'
import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary'
import { AppErrorBoundary } from '@/components/errors/AppErrorBoundary'
import { LoadingState } from '@/components/layout/LoadingState'
import { OfflineFallback } from '@/components/layout/OfflineFallback'
import { Toaster } from '@/components/ui/toaster'
import { ChatProvider } from '@/contexts/ChatContext'

// Lazy-load browser-only components that use useIsDarkMode / document APIs
const ChatWidget = lazy(() =>
  import('@/components/chat/ChatWidget').then((m) => ({
    default: m.ChatWidget,
  })),
)
const CRTOverlay = lazy(() =>
  import('../components/ui/crt-overlay').then((m) => ({
    default: m.CRTOverlay,
  })),
)
const CRTStartup = lazy(() =>
  import('../components/ui/crt-startup').then((m) => ({
    default: m.CRTStartup,
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

import appCss from '@/styles.css?url'
import i18n from '@/i18n'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
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
        <Suspense fallback={null}>
          <CRTOverlay />
        </Suspense>
        <Suspense fallback={null}>
          <CRTStartup />
        </Suspense>
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
      <CRTSoundProvider>
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
            </AppErrorBoundary>
          </AuthProvider>
          <Suspense fallback={null}>
            <TanStackRouterDevtools />
            <ReactQueryDevtools buttonPosition="bottom-right" />
          </Suspense>
        </QueryClientProvider>
      </CRTSoundProvider>
    </ThemeProvider>
  )
}

// Blocking inline script that applies the theme class before first paint,
// eliminating the light→dark CLS flash that happens when ThemeProvider's
// useEffect runs after hydration.
const THEME_INIT_SCRIPT = `(function(){var t=localStorage.getItem('starthn-theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.classList.toggle('light',!d);document.documentElement.style.colorScheme=d?'dark':'light'})()`

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang={(i18n.language ?? 'en-US').split('-')[0]} suppressHydrationWarning>
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

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, interactive-widget=resizes-content' },
      { name: 'theme-color', content: '#B8860B' },
      {
        name: 'description',
        content:
          'Računovodstvene usluge, porezno savjetovanje i finansijski menadžment. Start HN — vaš partner za rast.',
      },
      {
        name: 'keywords',
        content:
          'enterprise software development, AI solutions, cloud architecture, IoT, DevOps, digital transformation, Azure, Sarajevo, Bosnia',
      },
      { name: 'author', content: 'Start HN' },
      { name: 'robots', content: 'index,follow' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Start HN' },
      {
        property: 'og:title',
        content: 'Start HN — Računovodstvena agencija',
      },
      {
        property: 'og:description',
        content: 'StartHN',
      },
      {
        property: 'og:image',
        content: '/clean-square.png',
      },
      { property: 'og:url', content: 'https://starthn.ba' },
      { property: 'og:locale', content: 'en_US' },
      { name: 'twitter:card', content: 'summary_large_image' },
      {
        name: 'twitter:title',
        content: 'StartHN',
      },
      {
        name: 'twitter:description',
        content: 'StartHN',
      },
      {
        name: 'twitter:image',
        content: '/clean-square.png',
      },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Public+Sans:wght@400;500;600&display=swap' },
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/png', href: '/favicon-32.png' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.json' },
      { rel: 'canonical', href: 'https://starthn.ba/en-US' },
      { rel: 'preload', as: 'image', href: '/logo-64.webp', type: 'image/webp' },
    ],
    scripts: [
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
  notFoundComponent: () => (
    <Suspense fallback={<LoadingState fullPage message="Loading..." />}>
      <NotFoundPage />
    </Suspense>
  ),
  errorComponent: RouteErrorBoundary,
})
