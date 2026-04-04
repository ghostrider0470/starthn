import { StrictMode, Suspense, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'

import * as TanStackQueryProvider from './integrations/tanstack-query/root-provider.tsx'
import { ThemeProvider } from './components/theme-provider'
import { CRTSoundProvider } from './hooks/useCRTSound'
import { LoadingState } from './components/layout/LoadingState'
import { AppErrorBoundary } from './components/errors/AppErrorBoundary'
import { OfflineFallback } from './components/layout/OfflineFallback'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Initialize i18next
import './i18n'

import './styles.css'
import reportWebVitals from './reportWebVitals.ts'

// Create a new router instance

const TanStackQueryProviderContext = TanStackQueryProvider.getContext()
const router = createRouter({
  routeTree,
  context: {
    ...TanStackQueryProviderContext,
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
  defaultPendingComponent: () => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  ),
  defaultPendingMinMs: 200,
})

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  useEffect(() => {
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

function AppShell() {
  const isOnline = useOnlineStatus()

  return (
    <>
      {!isOnline && <OfflineFallback />}
      <Suspense
        fallback={
          isOnline
            ? <LoadingState fullPage message="Loading Horizon Tech..." />
            : <OfflineFallback fullPage />
        }
      >
        <RouterProvider router={router} />
      </Suspense>
    </>
  )
}

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('app')
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <ThemeProvider defaultTheme="system" storageKey="horizon-tech-theme">
        <CRTSoundProvider>
          <TanStackQueryProvider.Provider {...TanStackQueryProviderContext}>
            <AppErrorBoundary>
              <AppShell />
            </AppErrorBoundary>
          </TanStackQueryProvider.Provider>
        </CRTSoundProvider>
      </ThemeProvider>
    </StrictMode>,
  )
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
