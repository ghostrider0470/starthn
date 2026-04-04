import { Outlet, createRootRouteWithContext, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { MotionConfig } from 'motion/react'

import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { MobileBottomNav } from '../components/MobileBottomNav'
import { useI18nMeta } from '../hooks/useI18nMeta'
import { useTranslation } from 'react-i18next'

import TanStackQueryLayout from '../integrations/tanstack-query/layout.tsx'
import { NotFoundPage } from '@/components/errors/NotFoundPage'
import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary'
import { Toaster } from '@/components/ui/toaster'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

function RootComponent() {
  useI18nMeta()
  const { t } = useTranslation()

  return (
    <MotionConfig reducedMotion="user">
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
        <div
          aria-hidden
          className="h-[calc(6.75rem+env(safe-area-inset-bottom))] md:hidden"
        />
        <MobileBottomNav />
        <Toaster />
        <TanStackRouterDevtools />
        <TanStackQueryLayout />
      </div>
    </MotionConfig>
  )
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: RouteErrorBoundary,
})
