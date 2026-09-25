import { isApiPath } from './security-headers'
import { stripLocalePrefix } from '@/lib/i18n-utils'
import { isPrivateRoute } from '@/lib/seo'

/**
 * Server-rendered HTML pages: how the Worker (src/server.ts) edge-caches them
 * and how it hands page requests to TanStack Start.
 */

/**
 * Cache-Control for public HTML. s-maxage alone has no effect when a Worker
 * answers the request, so the Worker stores and replays pages itself through
 * the Cache API, which honours s-maxage (10 min). The keys are scoped to the
 * deployed version (deploymentIdFrom, wrangler.jsonc version_metadata), so a
 * deploy never replays the previous deploy's HTML. The TTL stays short
 * because nothing purges the cache when a post is published. No
 * stale-while-revalidate: a shared cache in front of us could otherwise keep
 * serving a page for a day after a deploy removed the assets it links.
 */
export const HTML_CACHE_CONTROL = 'public, max-age=0, s-maxage=600'

/** Click and campaign IDs that never change the rendered page. */
const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'gbraid',
  'wbraid',
  'msclkid',
])

export function isTrackingParam(name: string): boolean {
  const lower = name.toLowerCase()
  return lower.startsWith('utm_') || TRACKING_PARAMS.has(lower)
}

/**
 * The URL used as the HTML cache key: the request URL without utm_* and ad
 * click IDs, so every campaign link shares one cache entry with the clean URL.
 * Returns an untouched copy when there is nothing to strip.
 */
export function htmlCacheKeyUrl(url: URL): URL {
  const copy = new URL(url.toString())
  const tracking = [...copy.searchParams.keys()].filter(isTrackingParam)
  for (const name of new Set(tracking)) copy.searchParams.delete(name)
  return copy
}

/**
 * Query parameter that scopes a cache key to one Worker deployment. Only the
 * key carries it; it never appears in a page URL.
 */
export const DEPLOYMENT_KEY_PARAM = '__deployment'

/**
 * The Cache API key for a page. With a deployment ID, a new deploy starts with
 * an empty HTML cache: a page cached by the previous deploy links hashed
 * /assets files that no longer exist, and would load without its JS and CSS.
 */
export function htmlCacheKey(keyUrl: URL, deploymentId?: string): string {
  if (!deploymentId) return keyUrl.toString()
  const copy = new URL(keyUrl.toString())
  copy.searchParams.set(DEPLOYMENT_KEY_PARAM, deploymentId)
  return copy.toString()
}

/**
 * The Worker version ID from the `version_metadata` binding (wrangler.jsonc:
 * "version_metadata": { "binding": "CF_VERSION_METADATA" }), or undefined when
 * that binding is not configured.
 */
export function deploymentIdFrom(env: unknown): string | undefined {
  const metadata = (
    env as { CF_VERSION_METADATA?: { id?: unknown } } | undefined
  )?.CF_VERSION_METADATA
  return typeof metadata?.id === 'string' && metadata.id
    ? metadata.id
    : undefined
}

/** Private routes (login, admin, account…) are never stored in the edge cache. */
export function isHtmlCacheable(pathname: string): boolean {
  return !isPrivateRoute(stripLocalePrefix(pathname).toLowerCase())
}

/** TanStack Start's server-function endpoint (its default serverFns.base). */
export const SERVER_FN_PREFIX = '/_serverFn'

/**
 * The request to hand to TanStack Start's page renderer. Start answers a page
 * request whose Accept header names neither text/html nor *\/* with
 * `500 {"error":"Only HTML requests are supported here"}`, so a crawler or
 * agent asking for text/markdown or application/json got a 5xx. The site only
 * has HTML pages, so every GET/HEAD page request is rendered as HTML (200, or
 * the page's own 404), whatever it asked for. No Vary: Accept, because the
 * response never depends on Accept.
 *
 * /api and server functions keep their request as it is. Static files never
 * get here: Workers Assets serves them before the Worker runs.
 */
export function withHtmlAccept(request: Request): Request {
  const method = request.method.toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') return request

  const { pathname } = new URL(request.url)
  if (
    isApiPath(pathname) ||
    pathname === SERVER_FN_PREFIX ||
    pathname.startsWith(`${SERVER_FN_PREFIX}/`)
  ) {
    return request
  }
  if (request.headers.get('Accept') === 'text/html') return request

  const headers = new Headers(request.headers)
  headers.set('Accept', 'text/html')
  return new Request(request, { headers })
}
