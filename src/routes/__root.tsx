import { Outlet, createRootRouteWithContext, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { MotionConfig } from 'motion/react'

import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { MobileBottomNav } from '../components/MobileBottomNav'
import { CRTStartup } from '../components/ui/crt-startup'
import { CRTOverlay } from '../components/ui/crt-overlay'
import { useI18nMeta } from '../hooks/useI18nMeta'
import { useTranslation } from 'react-i18next'

import TanStackQueryLayout from '../integrations/tanstack-query/layout.tsx'
import { NotFoundPage } from '@/components/errors/NotFoundPage'
import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary'
import { Toaster } from '@/components/ui/toaster'
import { ChatProvider } from '@/contexts/ChatContext'
import { ChatWidget } from '@/components/chat/ChatWidget'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

function RootComponent() {
  useI18nMeta()
  const { t } = useTranslation()
  const location = useLocation()

  // Admin routes use their own layout (sidebar + no marketing nav)
  const isAdminRoute = /\/admin(\/|$)/.test(location.pathname)

  if (isAdminRoute) {
    return (
      <MotionConfig reducedMotion="user">
        <Outlet />
        <Toaster />
        <TanStackRouterDevtools />
        <TanStackQueryLayout />
      </MotionConfig>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <ChatProvider>
      <div className="min-h-screen flex flex-col relative">
        <a href="#main-content" className="skip-link">
          {t('nav.skipToContent')}
        </a>
        <CRTOverlay />
        <CRTStartup />
        <Navbar />
        <main
          id="main-content"
          tabIndex={-1}
          className="relative flex-1 overflow-x-hidden pt-16 pb-8 md:pb-0"
        >
            <Outlet />
        </main>
        <Footer />
        <ChatWidget />
        <div
          aria-hidden
          className="h-[calc(6.75rem+env(safe-area-inset-bottom))] md:hidden"
        />
        <MobileBottomNav />
        <TanStackRouterDevtools />
        <TanStackQueryLayout />
      </div>
      </ChatProvider>
    </MotionConfig>
  )
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: RouteErrorBoundary,
})
