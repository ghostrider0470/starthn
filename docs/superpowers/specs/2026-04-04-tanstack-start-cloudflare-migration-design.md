# TanStack Start + Cloudflare Workers Migration — Phase 1 Design

**Date:** 2026-04-04
**Status:** Draft
**Goal:** Migrate frontend from React SPA (Vite) on Azure SWA to TanStack Start (Streaming SSR) on Cloudflare Workers. Deploy Azure Functions as standalone Flex Consumption app.

## Context & Motivation

- Current PageSpeed score: 24-27 on mobile (SPA architecture)
- Azure SWA has no SSR support, 45s API timeout, no streaming for SSE chat
- Already paying for Cloudflare Workers Paid ($5/mo)
- Prerender worker exists as a workaround but only serves bots

This is Phase 1 of a larger migration to consolidate everything on Cloudflare:

| Phase | Scope | Status |
|---|---|---|
| **1 (this spec)** | Frontend SSR + standalone Azure Functions | Designing |
| 2 | Azure Blob Storage → Cloudflare R2 | Planned |
| 3 | MongoDB schema → D1 relational schema | Planned |
| 4 | Rewrite .NET API → TypeScript server functions | Planned |
| 5 | DNS cutover, decommission Azure | Planned |

## Architecture — End State (Phase 1)

```
User request → Cloudflare Edge (nearest of 300+ PoPs)
  ├── Cache HIT → serve cached HTML (~10ms)
  └── Cache MISS → Streaming SSR (TanStack Start on CF Worker)
        ├── Shell + layout sent immediately
        ├── Data fetched from Azure Functions Flex Consumption
        ├── Streamed to browser as it arrives
        └── Response cached at edge for next visitor

/api/* requests → CF Worker proxies → Azure Functions Flex Consumption
                                         └── Cosmos DB vCore (MongoDB)
```

## SSR Strategy: Streaming SSR + Edge Cache

- **Streaming SSR** via React 19 + TanStack Start: HTML shell sent immediately, data streams in as it arrives from the backend. No blank screen, no spinner.
- **Edge Cache** via Cloudflare Cache API: first visitor triggers SSR, response is cached at the edge. Subsequent visitors get cached HTML at static-file speed.
- **Per-route SSR control**: marketing pages SSR'd for performance + SEO. Admin/auth/dashboard pages client-rendered (`ssr: false`).

### SSR Route Map

**SSR enabled (marketing + SEO):**
- `/` (landing page) — hero, services, credibility sections
- `/about`, `/careers`, `/contact`, `/education`, `/support`
- `/blog/*` — listing and individual posts
- `/case-studies/*` — listing and individual studies
- `/team/*` — listing and individual profiles
- `/services/*` — all 6 service detail pages
- `/privacy`, `/terms`

**SSR disabled (`ssr: false`):**
- `/admin/*` — all admin routes (behind auth, no SEO value)
- `/dashboard`, `/workspace`, `/profile`, `/my-page` — behind auth
- `/login`, `/register`, `/forgot-password`, `/reset-password` — auth forms
- `/auth.callback`, `/confirm-email`, `/first-time-setup` — auth flow

### Browser-Only Code in SSR Routes

The landing page uses Three.js (globe), motion/react animations, and `window`-dependent code. These components are lazy-loaded with `Suspense` and render only on the client:

```tsx
const Globe = lazy(() => import('@/components/landing/Globe'))

// In the SSR'd landing page:
<Suspense fallback={<GlobePlaceholder />}>
  <Globe />
</Suspense>
```

The shell, navbar, text content, and SEO-critical sections render server-side. Heavy client-only components hydrate after the page loads.

## Entry Points & Configuration

### Files Changed

**`vite.config.ts`** — swap plugins, add Cloudflare:
- Remove: `TanStackRouterVite` from `@tanstack/router-plugin/vite`
- Add: `tanstackStart` from `@tanstack/react-start/plugin/vite` (includes router plugin internally)
- Add: `cloudflare` from `@cloudflare/vite-plugin`
- Keep: existing proxy config, manual chunks, tailwindcss plugin, XML middleware

```ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    port: 3000,
    proxy: { '/api': { target: 'http://localhost:8000' } },
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart(),
    viteReact(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: { /* existing chunk strategy */ },
      },
    },
  },
})
```

**`src/router.tsx`** (new) — router creation extracted from deleted `main.tsx`:
```tsx
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultStructuralSharing: true,
    defaultPreloadStaleTime: 0,
    defaultPendingMinMs: 200,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
```

**`src/routes/__root.tsx`** — absorbs `index.html` content, adds `shellComponent`:
- `head()` function returns all meta tags (charset, viewport, OG tags, Twitter cards, canonical)
- `shellComponent: RootDocument` owns the full `<html>` document with `<HeadContent />` and `<Scripts />`
- `component: RootComponent` remains existing layout (navbar, outlet, footer) and absorbs all providers from `main.tsx` (ThemeProvider, CRTSoundProvider, TanStackQueryProvider, AppErrorBoundary)
- Links: stylesheet (appCss), preconnect to CDN
- Scripts: Cloudflare Turnstile (async)

```tsx
import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      // OG tags, Twitter cards, etc.
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://htstorageprod.blob.core.windows.net' },
    ],
    scripts: [
      { src: 'https://challenges.cloudflare.com/turnstile/v0/api.js', async: true },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
```

**`wrangler.jsonc`** (new):
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "horizon-frontend",
  "compatibility_date": "2026-04-01",
  "compatibility_flags": ["nodejs_compat"],
  "main": "@tanstack/react-start/server-entry",
  "routes": [
    { "pattern": "horizon-tech.io/*", "zone_name": "horizon-tech.io" }
  ],
  "vars": {
    "API_ORIGIN": "https://ht-func-prod.azurewebsites.net"
  }
}
```

**`src/server.ts`** (new, optional) — API proxy logic:
```tsx
import handler from '@tanstack/react-start/server-entry'

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext) {
    const url = new URL(request.url)

    // Proxy /api/* to Azure Functions
    if (url.pathname.startsWith('/api/')) {
      return proxyToAzure(request, env, ctx)
    }

    // Everything else handled by TanStack Start
    return handler.fetch(request, env, ctx)
  },
}
```

### Files Deleted

- `index.html` — replaced by `__root.tsx` shellComponent
- `src/main.tsx` — replaced by `src/router.tsx` + TanStack Start client entry
- `staticwebapp.config.json` — no longer needed (headers/caching handled by Worker)

### Package Changes

| Add | Remove |
|---|---|
| `@tanstack/react-start` | `@tanstack/router-plugin` |
| `@cloudflare/vite-plugin` | |
| `wrangler` (dev dependency) | |

### Files Unchanged

- All 45 route files (except `__root.tsx`)
- All 277 components in `src/components/`
- All hooks in `src/hooks/`
- All services in `src/services/`
- All contexts (`AuthContext`, `ChatContext`)
- TanStack Query setup (`src/integrations/tanstack-query/`)
- Tailwind CSS (`src/styles.css`), design system
- i18n config (`src/i18n.ts`), locale files
- Zod schemas, env validation (`src/env.ts`)
- Utility functions, types, config

## API Proxy & Edge Caching

### Proxy

During Phase 1, the CF Worker proxies `/api/*` to Azure Functions Flex Consumption. Frontend code (`src/services/api.ts`, axios instance) doesn't change — it still calls `/api/*` relative paths.

### Edge Cache Tiers

| Tier | TTL | Routes |
|---|---|---|
| Long (1 hour) | `max-age=3600` | Blog posts, case studies, services content, team profiles |
| Short (5 min) | `max-age=300` | Blog listing, case study listing, category/tag lists |
| No cache | `private, no-store` | Auth endpoints, user data, admin CRUD, chat/LLM |

Implementation via Cloudflare Cache API in the proxy layer. Cache key = request URL.

### Cache Invalidation

Phase 1 uses TTL-based invalidation (1 hour max staleness). Purge-on-write (admin save triggers cache purge) is a future enhancement.

### SSR Data Fetching

Marketing route loaders fetch data server-side and embed it in the HTML:

```tsx
export const Route = createFileRoute('/$locale/blog/$slug')({
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData.post.title },
      { name: 'description', content: loaderData.post.excerpt },
      { property: 'og:image', content: loaderData.post.image },
    ],
  }),
  loader: ({ params }) => fetchBlogPost(params.slug),
})
```

Client-side TanStack Query still hydrates for subsequent navigations and mutations.

## Step 0: Azure Functions Flex Consumption

**Prerequisite:** The Azure Functions backend is currently a managed API on Azure SWA. Decommissioning SWA kills the backend. Must deploy as standalone first.

### What to do

1. Create Azure Functions Flex Consumption app (`ht-func-prod` in `ht-web-prod` resource group)
2. Deploy existing .NET 8 isolated worker backend to it
3. Configure CORS: allow `horizon-tech.io`, `*.workers.dev` (preview URLs)
4. Configure environment variables (Cosmos DB connection string, Azure OpenAI keys, Graph API creds, etc.)
5. Update CI/CD to deploy to new Functions app
6. Test all endpoints independently
7. Update CF Worker `API_ORIGIN` to point to new Functions URL

### Why Flex Consumption

- Pay-per-execution (no idle cost, same as current consumption model)
- Faster cold starts than classic consumption plan
- Configurable timeout (no 45s SWA limit) — important for chat/LLM streaming
- Always-ready instances option for zero cold starts on critical endpoints
- VNet integration for Cosmos DB private endpoints (future)

## Deployment & CI/CD

### Cloudflare Workers

GitHub Actions workflow (`.github/workflows/deploy-cloudflare.yml`):
1. Checkout → setup Node 20 → `npm ci`
2. `npm run lint` + `npm run test`
3. `npm run build` (Vite + TanStack Start SSR build)
4. `wrangler deploy` (with Cloudflare API token + account ID)

Preview deployments on PRs via `wrangler deploy --env preview`.

### DNS Cutover

1. Deploy to preview URL (`horizon-frontend-preview.workers.dev`) — test everything
2. Add Workers route for `horizon-tech.io/*` — traffic routes to Worker
3. Rollback: remove Workers route — traffic goes back to Azure SWA immediately

No DNS propagation delay. SSL handled automatically by Cloudflare Universal SSL (already active).

### Package.json Scripts

| Script | Before | After |
|---|---|---|
| `dev` | `vite --port 3000 --host` | `vite dev --port 3000 --host` |
| `build` | `vite build` | `vite build` (same command, Start plugin handles SSR) |
| `serve` | `vite preview` | `wrangler dev` (local Workers runtime) |
| — | — | `deploy`: `wrangler deploy` |

### Decommission After Cutover

- Azure SWA deployment workflow
- `staticwebapp.config.json`
- `horizon-prerender` Cloudflare Worker (SSR replaces it)

## Migration Steps (Incremental)

### Step 0: Standalone Azure Functions
- Deploy .NET 8 backend to Azure Functions Flex Consumption
- Configure CORS, env vars, CI/CD
- Verify all API endpoints work independently
- **Checkpoint:** Backend runs independently of SWA

### Step 1: TanStack Start in SPA Mode
- Swap plugins in `vite.config.ts`
- Create `src/router.tsx` with `getRouter()`
- Update `src/routes/__root.tsx` with `shellComponent` + `head()`
- Delete `index.html` and `src/main.tsx`
- Set `ssr: false` globally (temporary — SPA mode on Start infrastructure)
- Install `@tanstack/react-start`, remove `@tanstack/router-plugin`
- **Checkpoint:** `npm run dev` — app works exactly as before, nothing visibly changed

### Step 2: Enable SSR for Marketing Routes
- Remove global `ssr: false`
- Add `ssr: false` to admin, auth, and dashboard routes individually
- Fix hydration issues: lazy-load Three.js globe, motion animations, window-dependent code
- Add `head()` functions with SEO meta tags to marketing routes
- Configure i18next server-side initialization for SSR
- **Checkpoint:** `View Source` shows rendered HTML on marketing pages. PageSpeed score improves.

### Step 3: Deploy to Cloudflare Workers
- Add `wrangler.jsonc` and `@cloudflare/vite-plugin`
- Implement API proxy in `src/server.ts`
- Install `wrangler` dev dependency
- Deploy to preview URL
- Test: full app works on `*.workers.dev` — SSR, API calls, auth, admin
- **Checkpoint:** Running on Cloudflare Workers at preview URL

### Step 4: Edge Caching + Production Cutover
- Add Cache API logic in the proxy layer (tiered TTLs)
- Add GitHub Actions workflow for Cloudflare deployment
- Add Workers route for `horizon-tech.io/*`
- Monitor errors, verify production
- Decommission Azure SWA deployment + prerender worker
- **Checkpoint:** Production on Cloudflare. PageSpeed 80+. Mission complete.

## Testing & Validation

| Check | Method |
|---|---|
| App renders correctly | Visual check + Vitest suite |
| SSR works | `curl -s URL \| head -50` — HTML contains rendered content |
| PageSpeed improved | Lighthouse on preview URL (target: 80+ mobile) |
| API calls work | Test login, blog CRUD, admin operations, chat |
| No hydration mismatches | Browser console — zero React hydration warnings |
| Edge cache working | `cf-cache-status` response header = HIT |
| Auth flow works | Test JWT refresh, OAuth login/register, 2FA |
| i18n works | Switch locales, verify translations load and SSR correctly |
| SEO meta tags | View Source — OG tags, title, description present in HTML |

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Hydration mismatches from browser-only code | Lazy-load with Suspense, test incrementally in Step 2 |
| i18n translations not available during SSR | Initialize i18next server-side with URL locale param |
| Auth tokens (localStorage) unavailable during SSR | SSR only public pages; auth pages are `ssr: false` |
| Three.js/WebGL crashes server | Lazy-load, never import at top level in SSR routes |
| Azure Functions cold starts on proxy | Flex Consumption has faster cold starts; always-ready option available |
| Edge cache serves stale content | 1-hour TTL acceptable for blog/content; purge-on-write as enhancement |
| TanStack Start breaking changes (newer framework) | Pin versions, test thoroughly on preview before cutover |
