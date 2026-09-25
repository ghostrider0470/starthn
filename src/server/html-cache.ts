import { stripLocalePrefix } from '@/lib/i18n-utils'
import { isPrivateRoute } from '@/lib/seo'

/**
 * Edge caching of server-rendered HTML (Cache API in src/server.ts).
 * s-maxage alone has no effect when a Worker answers the request, so the
 * Worker stores and replays pages itself.
 */
export const HTML_CACHE_CONTROL =
  'public, max-age=0, s-maxage=60, stale-while-revalidate=300'

/** Click and campaign IDs that never change the rendered page. */
const TRACKING_PARAMS = new Set(['fbclid', 'gclid', 'gbraid', 'wbraid', 'msclkid'])

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

/** Private routes (login, admin, account…) are never stored in the edge cache. */
export function isHtmlCacheable(pathname: string): boolean {
  return !isPrivateRoute(stripLocalePrefix(pathname).toLowerCase())
}
