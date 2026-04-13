# TanStack Start + Cloudflare Workers Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Horizon Tech frontend from a React SPA (Vite + TanStack Router) on Azure SWA to TanStack Start (Streaming SSR) on Cloudflare Workers, and deploy Azure Functions as a standalone Flex Consumption app.

**Architecture:** TanStack Start replaces the pure-Vite SPA build. The `tanstackStart()` Vite plugin handles SSR compilation. `@cloudflare/vite-plugin` targets Cloudflare Workers. The existing 45 routes stay as-is; the root route gains a `shellComponent` that owns the `<html>` document (replacing `index.html`). Marketing pages get SSR for performance/SEO; admin/auth pages stay client-rendered. The API proxy forwards `/api/*` to a standalone Azure Functions Flex Consumption app.

**Tech Stack:** TanStack Start (`@tanstack/react-start`), Cloudflare Workers (`@cloudflare/vite-plugin`, `wrangler`), Vite 6, React 19, TanStack Router, TanStack Query, Tailwind CSS v4, i18next.

**Spec:** `docs/superpowers/specs/2026-04-04-tanstack-start-cloudflare-migration-design.md`

---

## File Map

### New Files
| File | Responsibility |
|---|---|
| `src/router.tsx` | Router factory — exports `getRouter()` with route tree, context, and config |
| `src/client.tsx` | Client hydration entry — calls `hydrateRoot` with `<StartClient />` |
| `src/server.ts` | Worker fetch handler — API proxy + delegates to TanStack Start SSR |
| `wrangler.jsonc` | Cloudflare Workers config — name, compat flags, routes, env vars |
| `.github/workflows/deploy-cloudflare.yml` | CI/CD — build + deploy to Cloudflare Workers |

### Modified Files
| File | Change |
|---|---|
| `vite.config.ts` | Swap `TanStackRouterVite()` → `tanstackStart()`, add `cloudflare()` |
| `src/routes/__root.tsx` | Add `shellComponent` (owns `<html>`), `head()` (meta tags), absorb providers from `main.tsx` |
| `src/components/theme-provider.tsx` | Make `useState` initializer SSR-safe (guard `localStorage`) |
| `src/routes/{-$locale}/admin.tsx` | Add `ssr: false` to route config |
| `src/routes/{-$locale}/login.tsx` | Add `ssr: false` to route config |
| Multiple auth/dashboard routes | Add `ssr: false` to route config |
| Multiple marketing routes | Add `head()` function for SEO meta tags |
| `package.json` | Add/remove dependencies, update scripts |
| `tsconfig.json` | Add `@tanstack/react-start` types |

### Deleted Files
| File | Reason |
|---|---|
| `index.html` | Replaced by `__root.tsx` `shellComponent` |
| `src/main.tsx` | Replaced by `src/router.tsx` + `src/client.tsx` |
| `staticwebapp.config.json` | Headers/caching handled by the Worker (after cutover) |

---

## Prerequisite: Step 0 — Standalone Azure Functions

> This is infrastructure work outside the frontend codebase. Complete before Step 3 (Cloudflare deployment). The `.NET 8` backend lives in the `api/` directory of this repo.

- [ ] **Step 0.1:** Create Azure Functions Flex Consumption app in Azure Portal or CLI:
```bash
az functionapp create \
  --name ht-func-prod \
  --resource-group ht-web-prod \
  --storage-account htstorageprod \
  --runtime dotnet-isolated \
  --runtime-version 8 \
  --functions-version 4 \
  --flexconsumption-location "West Europe" \
  --os-type Linux
```

- [ ] **Step 0.2:** Configure CORS on the new Functions app:
```bash
az functionapp cors add --name ht-func-prod --resource-group ht-web-prod \
  --allowed-origins "https://horizon-tech.io" "https://www.horizon-tech.io" "https://*.workers.dev" "http://localhost:3000"
```

- [ ] **Step 0.3:** Copy all application settings (env vars) from the SWA-linked API to the new Functions app (Cosmos DB connection string, Azure OpenAI keys, Graph API credentials, etc.).

- [ ] **Step 0.4:** Deploy the `api/` directory to the new Functions app:
```bash
cd api && func azure functionapp publish ht-func-prod
```

- [ ] **Step 0.5:** Test all endpoints against the new URL (`https://ht-func-prod.azurewebsites.net/api/*`). Verify auth, blog, case studies, chat, admin CRUD all work.

- [ ] **Step 0.6:** Create a separate GitHub Actions workflow (`.github/workflows/deploy-functions.yml`) for deploying the `api/` directory to the new Functions app on push to master.

---

## Step 1: TanStack Start in SPA Mode

Goal: Get the app running on TanStack Start infrastructure with `ssr: false` globally. The app should work exactly as before — nothing visibly changes for users.

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install new packages**

```bash
npm install @tanstack/react-start
npm install -D wrangler @cloudflare/vite-plugin
```

- [ ] **Step 2: Remove old router plugin**

```bash
npm uninstall @tanstack/router-plugin
```

- [ ] **Step 3: Verify package.json and lock file**

Run: `npm ls @tanstack/react-start @cloudflare/vite-plugin wrangler`
Expected: All three packages listed without errors.

Run: `npm ls @tanstack/router-plugin`
Expected: `(empty)` — package is gone.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: swap @tanstack/router-plugin for @tanstack/react-start, add wrangler + cloudflare plugin"
```

---

### Task 2: Create `src/router.tsx`

This file extracts the router creation from `src/main.tsx` into the `getRouter()` factory function that TanStack Start requires.

**Files:**
- Create: `src/router.tsx`

- [ ] **Step 1: Create `src/router.tsx`**

```tsx
import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const queryClient = new QueryClient()

  const router = createRouter({
    routeTree,
    context: {
      queryClient,
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

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/router.tsx`
Expected: No errors (may warn about routeTree.gen — that's fine, it auto-generates).

- [ ] **Step 3: Commit**

```bash
git add src/router.tsx
git commit -m "feat: create router.tsx with getRouter() factory for TanStack Start"
```

---

### Task 3: Update `src/routes/__root.tsx`

The root route now owns the entire `<html>` document via `shellComponent`. It absorbs the meta tags from `index.html` and the providers from `main.tsx`.

**Files:**
- Modify: `src/routes/__root.tsx`

- [ ] **Step 1: Rewrite `__root.tsx`**

Replace the entire file with:

```tsx
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useLocation,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { Suspense, useEffect, useState } from 'react'

import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { MobileBottomNav } from '../components/MobileBottomNav'
import { CRTStartup } from '../components/ui/crt-startup'
import { CRTOverlay } from '../components/ui/crt-overlay'
import { useI18nMeta } from '../hooks/useI18nMeta'
import { useTranslation } from 'react-i18next'

import { ThemeProvider } from '@/components/theme-provider'
import { CRTSoundProvider } from '@/hooks/useCRTSound'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotFoundPage } from '@/components/errors/NotFoundPage'
import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary'
import { AppErrorBoundary } from '@/components/errors/AppErrorBoundary'
import { LoadingState } from '@/components/layout/LoadingState'
import { OfflineFallback } from '@/components/layout/OfflineFallback'
import { Toaster } from '@/components/ui/toaster'
import { ChatProvider } from '@/contexts/ChatContext'
import { ChatWidget } from '@/components/chat/ChatWidget'

import appCss from '@/styles.css?url'
import '@/i18n'

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
  const { t } = useTranslation()
  const location = useLocation()
  const isOnline = useOnlineStatus()
  const { queryClient } = Route.useRouteContext()

  const isAdminRoute = /\/admin(\/|$)/.test(location.pathname)

  const content = isAdminRoute ? (
    <MotionConfig reducedMotion="user">
      <Outlet />
      <Toaster />
    </MotionConfig>
  ) : (
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
        </div>
      </ChatProvider>
    </MotionConfig>
  )

  return (
    <ThemeProvider defaultTheme="system" storageKey="horizon-tech-theme">
      <CRTSoundProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppErrorBoundary>
              {!isOnline && <OfflineFallback />}
              <Suspense
                fallback={
                  isOnline ? (
                    <LoadingState fullPage message="Loading Horizon Tech..." />
                  ) : (
                    <OfflineFallback fullPage />
                  )
                }
              >
                {content}
              </Suspense>
            </AppErrorBoundary>
          </AuthProvider>
        </QueryClientProvider>
      </CRTSoundProvider>
    </ThemeProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackRouterDevtools />
        <ReactQueryDevtools buttonPosition="bottom-right" />
        <Scripts />
      </body>
    </html>
  )
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#FF6B35' },
      {
        name: 'description',
        content:
          'Horizon Tech delivers enterprise software, AI solutions, cloud architecture, and IoT systems. From intelligent automation to cloud-native platforms — on time, on budget, at scale.',
      },
      {
        name: 'keywords',
        content:
          'enterprise software development, AI solutions, cloud architecture, IoT, DevOps, digital transformation, Azure, Sarajevo, Bosnia',
      },
      { name: 'author', content: 'Horizon Tech d.o.o.' },
      { name: 'robots', content: 'index,follow' },
      // Open Graph
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Horizon Tech' },
      {
        property: 'og:title',
        content: 'Horizon Tech — Engineering Systems That Scale',
      },
      {
        property: 'og:description',
        content:
          'Enterprise software, AI solutions, cloud architecture, and IoT systems. From intelligent automation to cloud-native platforms — on time, on budget, at scale.',
      },
      {
        property: 'og:image',
        content: 'https://www.horizon-tech.io/clean-square.png',
      },
      { property: 'og:url', content: 'https://www.horizon-tech.io' },
      { property: 'og:locale', content: 'en_US' },
      // Twitter
      { name: 'twitter:card', content: 'summary_large_image' },
      {
        name: 'twitter:title',
        content: 'Horizon Tech — Engineering Systems That Scale',
      },
      {
        name: 'twitter:description',
        content:
          'Enterprise software, AI solutions, cloud architecture, and IoT systems.',
      },
      {
        name: 'twitter:image',
        content: 'https://www.horizon-tech.io/clean-square.png',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/png', href: '/clean-square.png' },
      { rel: 'apple-touch-icon', href: '/clean-square.png' },
      { rel: 'manifest', href: '/manifest.json' },
      { rel: 'canonical', href: 'https://www.horizon-tech.io/en-US' },
      {
        rel: 'preconnect',
        href: 'https://htstorageprod.blob.core.windows.net',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'dns-prefetch',
        href: 'https://htstorageprod.blob.core.windows.net',
      },
      { rel: 'dns-prefetch', href: 'https://challenges.cloudflare.com' },
    ],
    scripts: [
      {
        src: 'https://challenges.cloudflare.com/turnstile/v0/api.js',
        async: true,
        defer: true,
      },
    ],
  }),
  ssr: false, // temporary: SPA mode for Step 1, remove in Step 2
  shellComponent: RootDocument,
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: RouteErrorBoundary,
})
```

> **Note on `appCss` import:** TanStack Start requires CSS to be imported with `?url` suffix to get the URL for the `<link>` tag in `head()`. If the bundler doesn't support `?url` for CSS, fall back to importing the CSS normally in the component and remove the `links` entry for the stylesheet.

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No new errors. The `?url` import on styles.css may need a type declaration — if so, add to `src/vite-env.d.ts`:
```ts
declare module '*.css?url' {
  const url: string
  export default url
}
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/__root.tsx src/vite-env.d.ts
git commit -m "feat: update __root.tsx with shellComponent, head(), and providers from main.tsx"
```

---

### Task 4: Create `src/client.tsx`

The client entry hydrates the app. Minimal — TanStack Start handles the rest.

**Files:**
- Create: `src/client.tsx`

- [ ] **Step 1: Create `src/client.tsx`**

```tsx
import { StartClient } from '@tanstack/react-start/client'
import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'

hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>,
)
```

- [ ] **Step 2: Commit**

```bash
git add src/client.tsx
git commit -m "feat: create client.tsx hydration entry for TanStack Start"
```

---

### Task 5: Update `vite.config.ts`

Swap the router plugin for the Start plugin. Keep everything else.

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Rewrite `vite.config.ts`**

Replace the entire file with:

```ts
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // Fix XML content type for sitemaps in dev server
    {
      name: 'xml-content-type',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('.xml')) {
            res.setHeader('Content-Type', 'text/xml')
          }
          next()
        })
      },
    },
    tanstackStart({
      tsr: {
        autoCodeSplitting: true,
        codeSplittingOptions: {
          defaultBehavior: [
            ['component'],
            ['pendingComponent'],
            ['errorComponent'],
            ['notFoundComponent'],
          ],
        },
      },
    }),
    viteReact(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(process.cwd(), './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('/react/') || id.includes('/react-dom/')) {
            return 'react-vendor'
          }

          if (
            id.includes('/@tanstack/react-router/') ||
            id.includes('/@tanstack/router-core/') ||
            id.includes('/@tanstack/history/') ||
            id.includes('/@tanstack/react-router-devtools/')
          ) {
            return 'router'
          }

          if (id.includes('/lucide-react/')) {
            return 'icons'
          }

          if (id.includes('/motion/') || id.includes('/framer-motion/')) {
            return 'motion'
          }

          if (id.includes('/recharts/')) {
            return 'react-vendor'
          }

          if (id.includes('/echarts-for-react/')) {
            return 'react-vendor'
          }

          if (id.includes('/echarts/')) {
            return 'echarts-core'
          }

          if (id.includes('/zrender/')) {
            return 'echarts-renderer'
          }

          if (id.includes('/react-i18next/')) {
            return 'react-vendor'
          }

          if (
            id.includes('/i18next/') ||
            id.includes('/i18next-http-backend/')
          ) {
            return 'i18n'
          }

          if (id.includes('/compromise/')) {
            return 'nlp-compromise'
          }

          if (id.includes('/franc/')) {
            return 'nlp-franc'
          }

          if (id.includes('/sentiment/')) {
            return 'nlp-sentiment'
          }

          if (id.includes('/three/examples/')) {
            return 'three-examples'
          }

          if (id.includes('/three/') || id.includes('/@types/three/')) {
            return 'three-core'
          }

          if (id.includes('/@react-three/fiber/')) {
            return 'three-fiber'
          }

          if (id.includes('/@react-three/drei/')) {
            return 'three-drei'
          }

          if (
            id.includes('/@react-three/postprocessing/') ||
            id.includes('/postprocessing/') ||
            id.includes('/three-stdlib/')
          ) {
            return 'three-effects'
          }

          if (
            id.includes('/world-atlas/') ||
            id.includes('/topojson-client/') ||
            id.includes('/earcut/') ||
            id.includes('/polygon-clipping/')
          ) {
            return 'geo-vendor'
          }
        },
      },
    },
    chunkSizeWarningLimit: 725,
  },
})
```

> **Note on `tanstackStart()` options:** The `tsr` key passes options to the embedded TanStack Router plugin — same options you previously passed to `TanStackRouterVite()`. If the `tsr` key is not recognized by the installed version, try passing the code splitting options at the top level of `tanstackStart({...})` instead, and check the `@tanstack/react-start` docs for the current API.

- [ ] **Step 2: Commit**

```bash
git add vite.config.ts
git commit -m "feat: swap TanStackRouterVite for tanstackStart plugin in vite config"
```

---

### Task 6: Delete Old Entry Points and Verify Dev Server

**Files:**
- Delete: `index.html`
- Delete: `src/main.tsx`
- Modify: `package.json` (update scripts)

- [ ] **Step 1: Delete `index.html`**

```bash
git rm index.html
```

- [ ] **Step 2: Delete `src/main.tsx`**

```bash
git rm src/main.tsx
```

- [ ] **Step 3: Update `package.json` scripts**

Change the `scripts` section:

```json
{
  "scripts": {
    "dev": "vite dev --port 3000 --host",
    "start": "vite dev --port 3000",
    "build": "vite build",
    "serve": "vite preview",
    "test": "vitest run",
    "lint": "eslint",
    "format": "prettier",
    "check": "prettier --write . && eslint --fix",
    "generate:sitemap": "tsx scripts/generate-sitemap.ts",
    "i18n:translate": "tsx scripts/translate-all.ts",
    "i18n:translate:fast": "tsx scripts/translate-all.ts --langs bs-BA,hr-HR,sr-Latn",
    "i18n:upload-en": "tsx scripts/translate-all.ts --upload-en",
    "blog:translate": "tsx scripts/translate-blogs.ts",
    "blog:translate:live": "tsx scripts/translate-blogs.ts --api-url https://www.horizon-tech.io/api"
  }
}
```

- [ ] **Step 4: Remove the `TanStackQueryLayout` import**

The `src/integrations/tanstack-query/layout.tsx` file rendered `ReactQueryDevtools`. This is now rendered directly in `__root.tsx`'s `RootDocument`. Delete the file if no other routes import it, or leave it if other route files reference it. Check:

```bash
grep -r "TanStackQueryLayout\|tanstack-query/layout" src/routes/ --include="*.tsx"
```

If only `__root.tsx` imported it (which we already replaced), no action needed.

- [ ] **Step 5: Start the dev server and verify**

```bash
npm run dev
```

Expected: The app starts on `http://localhost:3000`. Open it in a browser. Verify:
- Landing page renders with hero, navbar, footer
- Navigation works between routes
- Admin routes load (login first if needed)
- No console errors related to routing or missing modules

> **Troubleshooting:** If the dev server fails to start, check:
> 1. The route tree may need regenerating — the `tanstackStart()` plugin does this automatically on dev start, but you may need to delete `src/routeTree.gen.ts` and restart.
> 2. If `appCss` import with `?url` fails, try importing styles normally in the RootComponent instead: `import '@/styles.css'` and remove the `links` entry from `head()`.
> 3. If `HeadContent` or `Scripts` are not found, verify `@tanstack/react-start` is installed — these may be re-exported from `@tanstack/react-start` rather than `@tanstack/react-router`.

- [ ] **Step 6: Run existing tests**

```bash
npm run test
```

Expected: All existing tests pass. If any tests import from `main.tsx`, update them to import from `router.tsx` instead.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: complete TanStack Start SPA mode migration — delete index.html and main.tsx"
```

---

## Step 2: Enable SSR for Marketing Routes

Goal: Marketing pages return server-rendered HTML. Admin/auth/dashboard pages stay client-rendered. PageSpeed score should improve significantly.

---

### Task 7: Add `ssr: false` to Protected and Client-Only Routes

Before enabling SSR globally (by removing `ssr: false` from `__root.tsx`), mark all routes that must stay client-rendered.

**Files:**
- Modify: `src/routes/{-$locale}/admin.tsx`
- Modify: `src/routes/{-$locale}/login.tsx`
- Modify: `src/routes/{-$locale}/register.tsx`
- Modify: `src/routes/{-$locale}/forgot-password.tsx`
- Modify: `src/routes/{-$locale}/reset-password.tsx`
- Modify: `src/routes/{-$locale}/auth.callback.tsx`
- Modify: `src/routes/{-$locale}/confirm-email.tsx`
- Modify: `src/routes/{-$locale}/first-time-setup.tsx`
- Modify: `src/routes/{-$locale}/dashboard.tsx`
- Modify: `src/routes/{-$locale}/workspace.tsx`
- Modify: `src/routes/{-$locale}/profile.tsx`
- Modify: `src/routes/{-$locale}/my-page.tsx`
- Modify: `src/routes/{-$locale}/unauthorized.tsx`

- [ ] **Step 1: Add `ssr: false` to each protected route**

For each route file listed above, add `ssr: false` to the route config. The pattern is the same for all:

**Example — `src/routes/{-$locale}/admin.tsx`:**

Find the route definition (e.g., `createFileRoute(...)({...})`), and add `ssr: false` to the config object:

```tsx
export const Route = createFileRoute('/{-$locale}/admin')({
  ssr: false,
  // ... existing beforeLoad, component, etc.
})
```

Repeat for every route listed above. If a file uses `createFileRoute`, add `ssr: false` as the first property in the config object. This is a one-line addition per file.

> **Admin child routes:** Since `admin.tsx` is the layout route for all `/admin/*` routes, setting `ssr: false` on it should disable SSR for all nested admin routes. Verify this — if child routes still SSR, add `ssr: false` to each child individually.

- [ ] **Step 2: Remove `ssr: false` from `__root.tsx`**

In `src/routes/__root.tsx`, remove the `ssr: false` line from the route config:

```tsx
export const Route = createRootRouteWithContext<MyRouterContext>()({
  // ssr: false,  ← DELETE THIS LINE
  head: () => ({
  // ...
```

Now SSR is enabled globally, and only the routes marked `ssr: false` skip it.

- [ ] **Step 3: Commit**

```bash
git add src/routes/
git commit -m "feat: enable SSR globally, disable for admin/auth/dashboard routes"
```

---

### Task 8: Make ThemeProvider SSR-Safe

The `ThemeProvider` calls `localStorage.getItem()` directly in the `useState` initializer, which crashes during SSR because `localStorage` doesn't exist on the server.

**Files:**
- Modify: `src/components/theme-provider.tsx`

- [ ] **Step 1: Guard `localStorage` access**

In `src/components/theme-provider.tsx`, change the `useState` initializer (line 33-37):

Find:
```tsx
  const [theme, setTheme] = useState<Theme>(
    () => {
      const storedTheme = localStorage.getItem(storageKey)
      return isTheme(storedTheme) ? storedTheme : defaultTheme
    },
  )
```

Replace with:
```tsx
  const [theme, setTheme] = useState<Theme>(
    () => {
      if (typeof window === 'undefined') return defaultTheme
      const storedTheme = localStorage.getItem(storageKey)
      return isTheme(storedTheme) ? storedTheme : defaultTheme
    },
  )
```

Also guard the `setTheme` callback (around line 73):

Find:
```tsx
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
```

Replace with:
```tsx
    setTheme: (theme: Theme) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, theme)
      }
      setTheme(theme)
    },
```

- [ ] **Step 2: Verify existing tests pass**

```bash
npm run test
```

- [ ] **Step 3: Commit**

```bash
git add src/components/theme-provider.tsx
git commit -m "fix: make ThemeProvider SSR-safe by guarding localStorage access"
```

---

### Task 9: Fix Browser-Only Imports in SSR Routes

Components using `Three.js`, `WebGL`, `window`, or `document` at the module level will crash during SSR. Wrap them in lazy imports with Suspense.

**Files:**
- Modify: `src/routes/{-$locale}/index.tsx` (landing page — uses Three.js globe, motion animations)
- Potentially modify: any marketing route that imports browser-only code at the top level

- [ ] **Step 1: Audit landing page imports**

Open `src/routes/{-$locale}/index.tsx` and identify all imports that reference browser-only modules. Common culprits:
- `@react-three/*` components (globe)
- Components using `window.matchMedia`, `IntersectionObserver`, `requestAnimationFrame`
- `echarts` (uses canvas)

For each browser-only component, convert from a static import to a lazy import:

**Before:**
```tsx
import { GlobeSection } from '@/components/landing/GlobeSection'
```

**After:**
```tsx
import { lazy, Suspense } from 'react'
const GlobeSection = lazy(() =>
  import('@/components/landing/GlobeSection').then((m) => ({
    default: m.GlobeSection,
  })),
)
```

And in the JSX, wrap with Suspense:

**Before:**
```tsx
<GlobeSection />
```

**After:**
```tsx
<Suspense fallback={<div className="h-[600px]" />}>
  <GlobeSection />
</Suspense>
```

- [ ] **Step 2: Audit other marketing routes**

Check these files for browser-only imports:
```bash
grep -rn "window\.\|document\.\|navigator\.\|three\|@react-three\|echarts\|IntersectionObserver" src/routes/{-\$locale}/ --include="*.tsx" | grep -v "typeof window"
```

For each hit in an SSR-enabled route, either:
- Add a `typeof window !== 'undefined'` guard, or
- Convert to lazy import with Suspense

- [ ] **Step 3: Verify i18n works during SSR**

The `src/i18n.ts` file already guards `window` access with `typeof window !== 'undefined'`, defaulting to `DEFAULT_LOCALE` on the server. The `{-$locale}.tsx` route's `beforeLoad` calls `i18n.changeLanguage()` which sets the correct locale before components render.

**Known limitation:** `i18next` is a singleton — concurrent SSR requests for different locales could race. This is acceptable for Phase 1 because: (1) the edge cache means most requests are served from cache, not SSR'd, and (2) the locale mismatch only affects the initial SSR'd HTML, not the client-hydrated result. If this becomes an issue, the fix is `i18next.cloneInstance()` per request.

Test: `curl -s http://localhost:3000/bs-BA | grep -i "horizon"` — should return HTML with Bosnian locale content (or fallback to English if translations load async).

- [ ] **Step 4: Test SSR locally**

```bash
npm run dev
```

Open the browser, check the console for hydration mismatch warnings. If you see any, the component producing the mismatch needs to be lazy-loaded or guarded.

- [ ] **Step 5: Commit**

```bash
git add src/routes/ src/components/
git commit -m "fix: lazy-load browser-only components for SSR compatibility"
```

---

### Task 10: Add `head()` to Key Marketing Routes

Add per-route meta tags for SEO. Each marketing route should define its own `title`, `description`, and Open Graph tags in its `head()` function.

**Files:**
- Modify: `src/routes/{-$locale}/index.tsx`
- Modify: `src/routes/{-$locale}/about.tsx`
- Modify: `src/routes/{-$locale}/blog.index.tsx`
- Modify: `src/routes/{-$locale}/blog.$slug.tsx`
- Modify: `src/routes/{-$locale}/services.index.tsx` (and each service sub-route)
- Modify: `src/routes/{-$locale}/case-studies.index.tsx`
- Modify: `src/routes/{-$locale}/case-studies.$id.tsx`
- Modify: `src/routes/{-$locale}/team.index.tsx`
- Modify: `src/routes/{-$locale}/team.$slug.tsx`
- Modify: `src/routes/{-$locale}/contact.tsx`
- Modify: `src/routes/{-$locale}/careers.tsx`
- Modify: `src/routes/{-$locale}/privacy.tsx`
- Modify: `src/routes/{-$locale}/terms.tsx`

- [ ] **Step 1: Add `head()` to static marketing routes**

For routes without dynamic data (about, contact, privacy, terms, etc.), add a static `head()`:

**Example — `src/routes/{-$locale}/about.tsx`:**

```tsx
export const Route = createFileRoute('/{-$locale}/about')({
  head: () => ({
    meta: [
      { title: 'About — Horizon Tech' },
      {
        name: 'description',
        content: 'Learn about Horizon Tech — our team, mission, and values.',
      },
      { property: 'og:title', content: 'About — Horizon Tech' },
      {
        property: 'og:description',
        content: 'Learn about Horizon Tech — our team, mission, and values.',
      },
    ],
  }),
  component: AboutPage,
})
```

Apply the same pattern to: `contact.tsx`, `careers.tsx`, `privacy.tsx`, `terms.tsx`, `services.index.tsx`, and each service sub-route.

- [ ] **Step 2: Add `head()` to dynamic routes (blog, case studies, team)**

For routes with dynamic data (blog post, case study, team member), `head()` receives `loaderData`:

**Example — `src/routes/{-$locale}/blog.$slug.tsx`:**

```tsx
export const Route = createFileRoute('/{-$locale}/blog/$slug')({
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? 'Blog'} — Horizon Tech` },
      {
        name: 'description',
        content: loaderData?.excerpt ?? 'Read our latest blog post.',
      },
      {
        property: 'og:title',
        content: `${loaderData?.title ?? 'Blog'} — Horizon Tech`,
      },
      {
        property: 'og:description',
        content: loaderData?.excerpt ?? '',
      },
      {
        property: 'og:image',
        content: loaderData?.coverImage ?? 'https://www.horizon-tech.io/clean-square.png',
      },
    ],
  }),
  // existing loader, component, etc.
})
```

> **Note:** If the route doesn't have a `loader` yet, the `loaderData` will be undefined. Add loaders in a follow-up task when data fetching is moved server-side. For now, use optional chaining and fallback values.

- [ ] **Step 3: Verify meta tags appear in HTML**

```bash
npm run dev
```

Then in another terminal:
```bash
curl -s http://localhost:3000/en-US | head -40
```

Expected: You should see `<meta>` tags with the title, description, and OG tags in the HTML `<head>`. If SSR is working, you'll also see rendered HTML content in the `<body>`.

- [ ] **Step 4: Commit**

```bash
git add src/routes/
git commit -m "feat: add head() with SEO meta tags to marketing routes"
```

---

### Task 11: Verify SSR Output

**No files changed** — this is a validation task.

- [ ] **Step 1: Check SSR on the landing page**

```bash
curl -s http://localhost:3000/en-US | head -80
```

Expected: The HTML should contain rendered content — navbar links, hero heading text, etc. Not just an empty `<div id="app">`.

- [ ] **Step 2: Check that admin routes are NOT SSR'd**

```bash
curl -s http://localhost:3000/en-US/admin | head -40
```

Expected: The `<body>` should contain a minimal shell — the actual admin content loads client-side.

- [ ] **Step 3: Run Lighthouse**

Open `http://localhost:3000/en-US` in Chrome, run Lighthouse (Performance audit, Mobile). Compare the score to the baseline of 24-27.

Expected: Significant improvement in FCP and LCP metrics. The exact score depends on the dev server (production build will score higher).

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: All tests pass.

---

## Step 3: Deploy to Cloudflare Workers

Goal: The app runs on Cloudflare Workers with API proxying to Azure Functions. Verified on a preview URL.

---

### Task 12: Create `wrangler.jsonc`

**Files:**
- Create: `wrangler.jsonc`

- [ ] **Step 1: Create `wrangler.jsonc`**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "horizon-frontend",
  "compatibility_date": "2026-04-01",
  "compatibility_flags": ["nodejs_compat"],
  "main": "@tanstack/react-start/server-entry",
  "vars": {
    "API_ORIGIN": "https://ht-func-prod.azurewebsites.net"
  }
}
```

> **Note:** The `routes` field (mapping `horizon-tech.io/*` to this Worker) is added during production cutover (Task 17), not now. During development, we deploy to a `*.workers.dev` preview URL.

- [ ] **Step 2: Add wrangler types to tsconfig**

In `tsconfig.json`, add `"@cloudflare/workers-types"` to the `types` array if needed. If you run `npx wrangler types`, it generates a `worker-configuration.d.ts` file — add that to the project.

- [ ] **Step 3: Commit**

```bash
git add wrangler.jsonc
git commit -m "feat: add wrangler.jsonc for Cloudflare Workers deployment"
```

---

### Task 13: Create `src/server.ts` with API Proxy

The Worker's fetch handler intercepts `/api/*` requests and proxies them to Azure Functions. All other requests are handled by TanStack Start's SSR.

**Files:**
- Create: `src/server.ts`

- [ ] **Step 1: Create `src/server.ts`**

```ts
import handler, { createServerEntry } from '@tanstack/react-start/server-entry'

async function proxyToAzure(
  request: Request,
  apiOrigin: string,
): Promise<Response> {
  const url = new URL(request.url)
  const targetUrl = `${apiOrigin}${url.pathname}${url.search}`

  const headers = new Headers(request.headers)
  headers.set('Host', new URL(apiOrigin).host)
  // Remove cf-specific headers to avoid issues with Azure
  headers.delete('cf-connecting-ip')
  headers.delete('cf-ray')

  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    redirect: 'manual',
  })

  const response = await fetch(proxyRequest)

  // Return response with appropriate headers
  const responseHeaders = new Headers(response.headers)
  responseHeaders.set('Access-Control-Allow-Origin', '*')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}

export default createServerEntry({
  async fetch(request: Request) {
    const url = new URL(request.url)
    const env = (request as any).cf?.env ?? {}
    const apiOrigin =
      env.API_ORIGIN ?? 'https://ht-func-prod.azurewebsites.net'

    // Handle CORS preflight
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Authorization, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    // Proxy /api/* to Azure Functions
    if (url.pathname.startsWith('/api/')) {
      return proxyToAzure(request, apiOrigin)
    }

    // Everything else: delegate to TanStack Start SSR handler
    return handler.fetch(request)
  },
})
```

> **Note:** The exact API for accessing `env` bindings and the `handler` import in TanStack Start on Cloudflare may differ from the above. Check the `@tanstack/react-start` Cloudflare docs for how to access `env` (Cloudflare bindings) within the server entry. The proxy logic itself is correct — only the env access and handler delegation patterns may need adjustment.

- [ ] **Step 2: Commit**

```bash
git add src/server.ts
git commit -m "feat: create server.ts with API proxy to Azure Functions"
```

---

### Task 14: Add Cloudflare Plugin and Test Locally

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Add Cloudflare plugin to `vite.config.ts`**

At the top of the file, add the import:

```ts
import { cloudflare } from '@cloudflare/vite-plugin'
```

In the `plugins` array, add `cloudflare()` as the **first** plugin:

```ts
plugins: [
  cloudflare({ viteEnvironment: { name: 'ssr' } }),
  // ... existing plugins (xml-content-type, tanstackStart, viteReact, tailwindcss)
],
```

- [ ] **Step 2: Test locally with Wrangler**

```bash
npx wrangler dev
```

Expected: The app starts and is accessible at `http://localhost:8787` (Wrangler's default port). Verify:
- Landing page renders with SSR (View Source shows HTML content)
- Navigation works
- `/api/*` calls are proxied (if Azure Functions is running or the standalone app is deployed)

> **Troubleshooting:** If `wrangler dev` fails:
> - Ensure `wrangler.jsonc` is correct
> - Try `npx vite build && npx wrangler dev` to build first
> - Check that `nodejs_compat` flag is set in `wrangler.jsonc`

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "feat: add Cloudflare Vite plugin for Workers deployment"
```

---

### Task 15: Deploy to Preview URL

**No new files** — deployment verification.

- [ ] **Step 1: Build the project**

```bash
npm run build
```

Expected: Build succeeds. Output includes both client and server bundles.

- [ ] **Step 2: Deploy to Cloudflare Workers preview**

```bash
npx wrangler deploy
```

Expected: Deploys to `https://horizon-frontend.<your-subdomain>.workers.dev`. The URL is printed in the output.

- [ ] **Step 3: Verify on the preview URL**

Open the preview URL in a browser. Test:
- Landing page loads with SSR (View Source shows rendered HTML)
- Navigation between pages works
- API calls work (blog posts load, etc.)
- Admin login works
- No console errors

- [ ] **Step 4: Run Lighthouse on preview**

Run Lighthouse (Performance, Mobile) on the preview URL. Compare to the baseline 24-27.

Expected: Significant improvement. Target: 70+ (production caching will push this higher).

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve deployment issues found during preview testing"
```

---

## Step 4: Edge Caching + Production Cutover

Goal: Add edge caching for API responses, set up CI/CD, and go live.

---

### Task 16: Add Edge Caching to API Proxy

**Files:**
- Modify: `src/server.ts`

- [ ] **Step 1: Add caching logic to the proxy**

In `src/server.ts`, update the `proxyToAzure` function and the main fetch handler to use the Cache API:

Add this function above `proxyToAzure`:

```ts
function getCacheTtl(pathname: string): number | null {
  // Long cache: individual content items
  if (
    /^\/api\/blog\/[^/]+$/.test(pathname) ||
    /^\/api\/case-studies\/[^/]+$/.test(pathname) ||
    /^\/api\/team\/[^/]+$/.test(pathname)
  ) {
    return 3600 // 1 hour
  }

  // Short cache: list endpoints
  if (
    pathname === '/api/blog' ||
    pathname === '/api/case-studies' ||
    pathname === '/api/team' ||
    pathname === '/api/categories' ||
    pathname === '/api/tags'
  ) {
    return 300 // 5 minutes
  }

  // No cache: auth, admin, mutations, chat
  return null
}
```

Update the `/api/*` handling in the main `fetch` function:

```ts
// Proxy /api/* to Azure Functions — with edge caching for GET requests
if (url.pathname.startsWith('/api/')) {
  const ttl = request.method === 'GET' ? getCacheTtl(url.pathname) : null

  if (ttl !== null) {
    const cache = caches.default
    const cacheKey = new Request(url.toString(), { method: 'GET' })
    const cached = await cache.match(cacheKey)
    if (cached) return cached

    const response = await proxyToAzure(request, apiOrigin)
    const cachedResponse = new Response(response.body, response)
    cachedResponse.headers.set('Cache-Control', `public, max-age=${ttl}`)
    // waitUntil not available in all contexts — use try/catch
    try {
      const ctx = (globalThis as any).__cf_ctx
      ctx?.waitUntil(cache.put(cacheKey, cachedResponse.clone()))
    } catch {
      // Cache write failed — non-critical, response still returned
    }
    return cachedResponse
  }

  return proxyToAzure(request, apiOrigin)
}
```

> **Note:** Access to `ExecutionContext.waitUntil()` and `caches.default` depends on the TanStack Start + Cloudflare integration API. The pattern above is standard Cloudflare Workers API — but you may need to access `ctx` differently within the TanStack Start server entry. Check docs and adjust.

- [ ] **Step 2: Test caching locally**

```bash
npx wrangler dev
```

Make a request to a blog endpoint twice. Second request should be faster. Check response headers for `cf-cache-status`.

- [ ] **Step 3: Deploy and verify**

```bash
npx wrangler deploy
```

```bash
curl -sI https://horizon-frontend.<subdomain>.workers.dev/api/blog | grep -i cache
```

Expected: `Cache-Control: public, max-age=300` and eventually `cf-cache-status: HIT` on repeat requests.

- [ ] **Step 4: Commit**

```bash
git add src/server.ts
git commit -m "feat: add edge caching for public API responses via Cloudflare Cache API"
```

---

### Task 17: Create Cloudflare Deployment Workflow

**Files:**
- Create: `.github/workflows/deploy-cloudflare.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches:
      - master
    paths-ignore:
      - 'api/**'
      - 'docs/**'
  pull_request:
    types: [opened, synchronize, reopened]
    branches:
      - master
    paths-ignore:
      - 'api/**'
      - 'docs/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate sitemap
        run: npm run generate:sitemap

      - name: Create .env file
        run: |
          echo 'VITE_API_URL=/api' > .env
          echo 'VITE_MICROSOFT_CLIENT_ID=${{ secrets.VITE_MICROSOFT_CLIENT_ID }}' >> .env
          echo 'VITE_LOCALES_CDN=https://htstorageprod.blob.core.windows.net/locales' >> .env
          echo 'VITE_APP_TITLE=Horizon Tech' >> .env
          echo 'VITE_FEATURE_CASE_STUDIES=false' >> .env
          echo 'VITE_FEATURE_TECHNICAL_RESOURCES=false' >> .env
          echo 'VITE_FEATURE_CHAT=true' >> .env
          echo 'VITE_FEATURE_INNOVATION_LAB=false' >> .env

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm run test

      - name: Build
        run: npm run build

      - name: Deploy to Cloudflare Workers
        if: github.event_name == 'push'
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: f3da2a96eda666c8ef38d90ef261eb84

      - name: Deploy Preview (PRs)
        if: github.event_name == 'pull_request'
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: f3da2a96eda666c8ef38d90ef261eb84
          command: deploy --env preview
```

- [ ] **Step 2: Add GitHub repository secrets**

In the GitHub repo settings, add:
- `CLOUDFLARE_API_TOKEN` — a Cloudflare API token with Workers permissions
- `VITE_MICROSOFT_CLIENT_ID` — the OAuth client ID (move out of plain text in workflow)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy-cloudflare.yml
git commit -m "ci: add Cloudflare Workers deployment workflow"
```

---

### Task 18: Production Cutover

This is the final deployment task. Only proceed after thorough testing on the preview URL.

**Files:**
- Modify: `wrangler.jsonc` (add production routes)
- Modify/Delete: `.github/workflows/swa-deploy.yml` (disable or remove SWA deployment)

- [ ] **Step 1: Add production route to `wrangler.jsonc`**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "horizon-frontend",
  "compatibility_date": "2026-04-01",
  "compatibility_flags": ["nodejs_compat"],
  "main": "@tanstack/react-start/server-entry",
  "routes": [
    { "pattern": "horizon-tech.io/*", "zone_name": "horizon-tech.io" },
    { "pattern": "www.horizon-tech.io/*", "zone_name": "horizon-tech.io" }
  ],
  "vars": {
    "API_ORIGIN": "https://ht-func-prod.azurewebsites.net"
  }
}
```

- [ ] **Step 2: Deploy to production**

```bash
npx wrangler deploy
```

- [ ] **Step 3: Verify production**

- Open `https://www.horizon-tech.io` — verify landing page loads with SSR
- Check `View Source` — HTML contains rendered content
- Test navigation, blog, case studies, admin login
- Run Lighthouse (target: 80+ mobile PageSpeed)
- Check `curl -sI https://www.horizon-tech.io | grep cf-` for Cloudflare headers

- [ ] **Step 4: Disable SWA deployment**

Rename or delete the old workflow:

```bash
git rm .github/workflows/swa-deploy.yml
```

> **Keep as rollback:** If you want a safety net, rename to `swa-deploy.yml.bak` instead of deleting. To rollback: remove the Workers routes in Cloudflare dashboard — traffic falls back to the DNS proxy target (Azure SWA).

- [ ] **Step 5: Delete `staticwebapp.config.json`**

```bash
git rm staticwebapp.config.json
```

Security headers and cache rules previously in this file are now handled by the Worker's response headers. Add them to `src/server.ts` if not already present:

```ts
// Add to SSR responses in server.ts
responseHeaders.set('X-Content-Type-Options', 'nosniff')
responseHeaders.set('X-Frame-Options', 'DENY')
responseHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin')
responseHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
```

- [ ] **Step 6: Decommission prerender worker**

In the Cloudflare dashboard, delete the `horizon-prerender` Worker. SSR replaces it entirely.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: production cutover to Cloudflare Workers — decommission SWA"
```

- [ ] **Step 8: Monitor for 24-48 hours**

Watch for:
- Error rates in Cloudflare dashboard (Workers → Metrics)
- PageSpeed scores on key pages
- API response times
- User-reported issues

If anything goes wrong: remove the Workers routes in Cloudflare dashboard. Traffic reverts to Azure SWA immediately (as long as the SWA is still running).
