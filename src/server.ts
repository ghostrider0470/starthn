import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { handleD1Route } from './server/db/api-routes'
import { handleAdminRoute } from './server/db/admin-routes'
import { setD1, clearD1 } from './server/d1-context'
import { setAssets, clearAssets } from './server/assets-context'
import { handleImageRequest } from './server/image-handler'
import { handleImageWarm } from './server/image-warm'
import { handleSync } from './server/sync-receiver'
import { handleHealth } from './server/health'
import type { Bindings, ImageWriteMessage } from './server/bindings'
import { handleR2WriteQueue } from './server/r2-queue-consumer'
import { getLocaleFromPath } from '@/lib/i18n-utils'

const app = new Hono<{ Bindings: Bindings }>()

// ─── Constants ─────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://horizon-tech.io',
  'https://www.horizon-tech.io',
  'http://localhost:3000',
]

function getApiOrigin(env: Bindings): string {
  return env?.API_ORIGIN || 'https://ht-func-prod.azurewebsites.net'
}

// ─── Middleware ─────────────────────────────────────────────

// CORS for all /api/* routes
app.use('/api/*', cors({
  origin: (origin) => {
    if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.workers.dev')) {
      return origin
    }
    return 'https://www.horizon-tech.io'
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-Authorization', 'Authorization'],
  maxAge: 86400,
}))

// Security headers for API responses
app.use('/api/*', secureHeaders({
  xFrameOptions: 'DENY',
  referrerPolicy: 'strict-origin-when-cross-origin',
}))

// ─── Image proxy ────────────────────────────────────────────
app.get('/img/*', (c) => handleImageRequest(c))

// ─── Admin routes ──────────────────────────────────────────
// Reads: serve from D1 at edge (fast).
// Writes: proxy to Azure → Cosmos (source of truth). Change Feed syncs back to D1.
app.get('/api/manage/*', handleEdgeAdmin)
app.get('/api/roles', handleEdgeAdmin)
app.get('/api/roles/*', handleEdgeAdmin)
app.get('/api/permissions', handleEdgeAdmin)
app.post('/api/manage/*', (c) => proxyToAzure(c))
app.put('/api/manage/*', (c) => proxyToAzure(c))
app.patch('/api/manage/*', (c) => proxyToAzure(c))
app.delete('/api/manage/*', (c) => proxyToAzure(c))

async function handleEdgeAdmin(c: any) {
  if (!c.env?.DB || !c.env?.JWT_SECRET) return proxyToAzure(c)

  try {
    const response = await handleAdminRoute(c.req.raw, c.env, c.executionCtx)
    if (response) return response
  } catch (e) {
    console.error('[admin] Error, falling through to Azure:', e)
  }

  return proxyToAzure(c)
}

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
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
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
  if (/^\/api\/(blog|case-studies|team|categories|tags)$/.test(pathname)) return 300
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
      headers.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')
      const cacheable = new Response(response.body, { status: response.status, headers })

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
