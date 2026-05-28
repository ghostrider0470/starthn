import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { handleD1Route } from './server/db/api-routes'
import { handleAdminRoute } from './server/db/admin-routes'
import { handleAuthRoute } from './server/routes/auth'
import { handleProfileRoute } from './server/routes/profile'
import { handleUploadRoute } from './server/routes/upload'
import { setD1, clearD1 } from './server/d1-context'
import { setAssets, clearAssets } from './server/assets-context'
import { handleImageRequest } from './server/image-handler'
import { handleImageWarm } from './server/image-warm'
import { handleSync } from './server/sync-receiver'
import { handleHealth } from './server/health'
import { handleSitemap } from './server/sitemap'
import type { Bindings, ImageWriteMessage } from './server/bindings'
import { handleR2WriteQueue } from './server/r2-queue-consumer'
import {
  getD1PrimaryMissingBindings,
  isD1PrimaryEnabled,
} from './server/d1-primary-routing'
import { getLocaleFromPath } from '@/lib/i18n-utils'

const app = new Hono<{ Bindings: Bindings }>()

// ─── Constants ─────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:5173',
  'https://starthn.ba',
  'https://www.starthn.ba',
]

function getApiOrigin(env: Bindings): string {
  return env?.API_ORIGIN || 'https://starthn-func-prod.azurewebsites.net'
}

// ─── Middleware ─────────────────────────────────────────────

// Redirect apex → www
app.use('*', async (c, next) => {
  const host = c.req.header('host') ?? ''
  if (host === 'starthn.ba') {
    const url = new URL(c.req.url)
    url.hostname = 'www.starthn.ba'
    return c.redirect(url.toString(), 301)
  }
  return next()
})

// CORS for all /api/* routes
app.use(
  '/api/*',
  cors({
    origin: (origin) => {
      if (!origin) return 'https://starthn.ba'
      if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.workers.dev')) {
        return origin
      }
      return 'https://starthn.ba'
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-Authorization', 'Authorization'],
    maxAge: 86400,
  }),
)

// Security headers for API responses
app.use(
  '/api/*',
  secureHeaders({
    xFrameOptions: 'DENY',
    referrerPolicy: 'strict-origin-when-cross-origin',
  }),
)

// ─── Maintenance mode ───────────────────────────────────────
app.use('/api/*', async (c, next) => {
  if (c.env?.MAINTENANCE_MODE === 'true') {
    const method = c.req.method
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      return c.json({ error: 'Maintenance in progress. Write endpoints are temporarily unavailable.' }, 503)
    }
  }
  await next()
})

// ─── Image proxy ────────────────────────────────────────────
app.get('/img/*', (c) => handleImageRequest(c))

// ─── D1_PRIMARY feature-flag routing ───────────────────────
// When D1_PRIMARY=true, route auth/profile/admin through D1 handlers.
// Missing bindings and handler errors fail closed so local Wrangler cannot
// silently proxy to Azure and hide a broken D1/R2 setup.
type RouteHandler = (request: Request, env: any) => Promise<Response | null>

type D1PrimaryRouteOptions = {
  requiredBindings?: readonly string[]
  proxyOnNull?: boolean
}

function d1PrimaryError(message: string, status = 500, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function handleD1PrimaryRoute(
  c: any,
  handler: RouteHandler,
  options: D1PrimaryRouteOptions = {},
) {
  if (!isD1PrimaryEnabled(c.env)) return proxyToAzure(c)

  const missing = getD1PrimaryMissingBindings(c.env, options.requiredBindings)
  if (missing.length > 0) {
    return d1PrimaryError('D1_PRIMARY is enabled but required Worker bindings are missing.', 500, {
      missingBindings: missing,
      hint: 'For local `npx wrangler dev`, set these in .dev.vars. Do not let this route proxy to Azure.',
    })
  }

  try {
    const response = await handler(c.req.raw, c.env)
    if (response) return response
  } catch (e) {
    console.error('[d1-primary] Local route failed:', e)
    return d1PrimaryError('D1_PRIMARY route failed locally.', 500)
  }

  if (options.proxyOnNull) {
    return proxyToAzure(c)
  }

  return d1PrimaryError('D1_PRIMARY route is not implemented locally.', 501, {
    path: c.req.path,
  })
}

// ─── Auth routes ────────────────────────────────────────────
app.all('/api/auth/*', (c) => handleD1PrimaryRoute(c, handleAuthRoute))

// ─── User/profile routes ────────────────────────────────────
app.all('/api/user/*', (c) => handleD1PrimaryRoute(c, handleProfileRoute, { proxyOnNull: true }))

// ─── Admin routes ──────────────────────────────────────────
app.all('/api/manage/*', (c) => handleD1PrimaryRoute(c, (req, env) => handleAdminRoute(req, env, c.executionCtx), { proxyOnNull: true }))
app.get('/api/roles', (c) => handleD1PrimaryRoute(c, (req, env) => handleAdminRoute(req, env, c.executionCtx), { proxyOnNull: true }))
app.get('/api/roles/*', (c) => handleD1PrimaryRoute(c, (req, env) => handleAdminRoute(req, env, c.executionCtx), { proxyOnNull: true }))
app.get('/api/permissions', (c) => handleD1PrimaryRoute(c, (req, env) => handleAdminRoute(req, env, c.executionCtx), { proxyOnNull: true }))

// ─── Upload routes ─────────────────────────────────────────
app.post('/api/upload/image', (c) =>
  handleD1PrimaryRoute(c, handleUploadRoute, {
    requiredBindings: ['DB', 'JWT_SECRET', 'IMG_CACHE'],
  }),
)

// ─── Public reads (D1 at edge) ─────────────────────────────
app.get('/api/blog', handleEdgeRead)
app.get('/api/blog/:slug', handleEdgeRead)
app.get('/api/blog/categories', handleEdgeRead)
app.get('/api/blog/tags', handleEdgeRead)
app.get('/api/case-studies', handleEdgeRead)
app.get('/api/case-studies/:slug', handleEdgeRead)
app.get('/api/authors', handleEdgeRead)
app.get('/api/authors/:slug', handleEdgeRead)

async function handleEdgeRead(c: any) {
  if (!c.env?.DB) return proxyToAzure(c)

  const response = await handleD1Route(c.req.raw, c.env)
  if (response) return response

  return proxyToAzure(c)
}

// ─── Sitemaps (dynamic: includes published blog posts from D1) ─
app.get('/sitemap*', async (c) => {
  const res = await handleSitemap(c.req.raw, c.env)
  return res ?? c.notFound()
})

// ─── Internal sync endpoints (shared-secret auth) ──────────
app.post('/api/internal/image-warm', (c) => handleImageWarm(c))
app.post('/api/internal/sync', (c) => handleSync(c))
app.get('/api/internal/health', (c) => handleHealth(c))

// ─── Azure proxy fallback (auth, chat, uploads, etc.) ──────
app.all('/api/*', (c) => proxyToAzure(c))

async function proxyToAzure(c: any): Promise<Response> {
  const request = c.req.raw
  const apiOrigin = getApiOrigin(c.env)
  const url = new URL(request.url)
  const targetUrl = `${apiOrigin}${url.pathname}${url.search}`

  const headers = new Headers(request.headers)
  headers.set('Host', new URL(apiOrigin).host)
  headers.delete('cf-connecting-ip')
  headers.delete('cf-ray')

  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers,
    body:
      request.method !== 'GET' && request.method !== 'HEAD'
        ? request.body
        : undefined,
    redirect: 'manual',
  })

  const response = await fetch(proxyRequest)

  // Edge cache for cacheable GET requests
  if (request.method === 'GET') {
    const ttl = getCacheTtl(url.pathname)
    if (ttl !== null) {
      const cache = caches.default
      const cacheKey = new Request(url.toString(), { method: 'GET' })
      const cached = await cache.match(cacheKey)
      if (cached) return cached

      const cachedResponse = new Response(response.body, response)
      cachedResponse.headers.set('Cache-Control', `public, max-age=${ttl}`)
      c.executionCtx?.waitUntil(cache.put(cacheKey, cachedResponse.clone()))
      return cachedResponse
    }
  }

  return response
}

function getCacheTtl(pathname: string): number | null {
  if (/^\/api\/(blog|case-studies|team)\/[^/]+$/.test(pathname)) return 3600
  if (/^\/api\/(blog|case-studies|team|categories|tags)$/.test(pathname))
    return 300
  return null
}

// ─── SSR fallback (TanStack Start) ─────────────────────────
app.all('*', async (c) => {
  const request = c.req.raw
  const url = new URL(request.url)

  // Edge-cache HTML responses via the Cache API.
  // (s-maxage headers alone have no effect when a Worker handles the request.)
  const isGet = request.method === 'GET'
  const cache = isGet ? caches.default : null
  const cacheKey = isGet ? new Request(url.toString(), { method: 'GET' }) : null

  if (cache && cacheKey) {
    const cached = await cache.match(cacheKey)
    if (cached) return cached
  }

  // Make D1 + ASSETS available to route loaders during SSR
  setD1(c.env?.DB)
  setAssets(c.env?.ASSETS)
  try {
    const response = await handler.fetch(request)

    if (response.headers.get('Content-Type')?.includes('text/html')) {
      const headers = new Headers(response.headers)
      headers.set(
        'Cache-Control',
        'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
      )
      const cacheable = new Response(response.body, {
        status: response.status,
        headers,
      })

      if (cache && cacheKey && response.status === 200) {
        c.executionCtx?.waitUntil(cache.put(cacheKey, cacheable.clone()))
      }

      return cacheable
    }

    return response
  } finally {
    clearD1()
    clearAssets()
  }
})

// ─── Export ────────────────────────────────────────────────
const serverEntry = createServerEntry({ fetch: app.fetch })

export default {
  fetch: serverEntry.fetch,
  async queue(batch: MessageBatch<ImageWriteMessage>, env: Bindings) {
    await handleR2WriteQueue(batch, env)
  },
}
