import { lookupLegacy } from './legacy-redirects'
import {
  DEFAULT_LOCALE,
  resolveLocaleAlias,
  withLocalePath,
} from '@/lib/i18n-utils'
import { isPrivateRoute } from '@/lib/seo'
import { SERVICE_ROUTES } from '@/lib/service-routes'

/**
 * One-hop URL canonicalization for every page request, run by the Worker
 * (src/server.ts) before TanStack Start sees the request.
 *
 * Before this, an old URL such as https://starthn.ba/o-nama/ went apex → www
 * (301), then a 307 for the trailing slash, then a 301 to the homepage — a
 * soft 404 that threw away the page's ranking. Here the host, slashes, locale,
 * old WordPress path and letter case are all fixed in a single absolute 301,
 * and prefix-less paths that are not a route get a real 404.
 */

export const ORIGIN = 'https://www.starthn.ba'
const WWW_HOST = 'www.starthn.ba'
const APEX_HOST = 'starthn.ba'

export type CanonicalResult =
  | { kind: 'redirect'; location: string }
  | { kind: 'notFound' }
  | null

/**
 * First path segments of the routes under src/routes/{-$locale}/. A prefix-less
 * URL starting with one of these gets the default locale; any other
 * prefix-less URL is a 404. canonical-url.test.ts keeps this list in sync with
 * the route files.
 */
export const KNOWN_TOP_SEGMENTS = [
  'about',
  'services',
  'contact',
  'blog',
  'careers',
  'certificates',
  'mission-vision',
  'privacy',
  'terms',
  'team',
  'support',
  'education',
  'login',
  'register',
  'dashboard',
  'admin',
  'profile',
  'my-page',
  'workspace',
  'forgot-password',
  'reset-password',
  'confirm-email',
  'first-time-setup',
  'unauthorized',
  'auth',
  '404',
] as const

const KNOWN_TOP_SEGMENT_SET: ReadonlySet<string> = new Set(KNOWN_TOP_SEGMENTS)

/** App-owned paths that are never rewritten (only moved from apex to www). */
const PASS_THROUGH_PREFIXES = [
  '/api/',
  '/img/',
  '/assets/',
  '/locales/',
  '/cdn-cgi/',
  '/_serverFn',
]

/** Files the Worker (or Workers Assets) serves at the root. */
const ROOT_FILES = new Set(['/sitemap.xml', '/robots.txt', '/llms.txt'])
const CHILD_SITEMAP = /^\/sitemap-[^/]+\.xml$/

/** Vite dev-server internals; only ever seen on localhost. */
const DEV_PREFIXES = ['/@', '/__', '/node_modules/', '/src/']

const FILE_EXTENSION = /\.[a-z0-9]{1,8}$/i

const SERVICE_SLUGS: ReadonlySet<string> = new Set(
  Object.values(SERVICE_ROUTES).map((route) => route.replace(/^\/services\//, '')),
)

const NOT_FOUND = { kind: 'notFound' } as const

function redirect(location: string): CanonicalResult {
  return { kind: 'redirect', location }
}

function isProductionHost(hostname: string): boolean {
  return hostname === WWW_HOST || hostname === APEX_HOST
}

/**
 * Origin for redirects: always the www production origin for starthn.ba
 * requests; the request's own origin elsewhere (localhost, workers.dev
 * previews), so local development never bounces to production.
 */
export function redirectOrigin(url: URL): string {
  return isProductionHost(url.hostname) ? ORIGIN : url.origin
}

/** Lowercase a path, leaving percent-escapes (e.g. "%C5%BE") untouched. */
function lowercasePath(path: string): string {
  return path
    .split(/(%[0-9A-Fa-f]{2})/)
    .map((part, index) => (index % 2 === 1 ? part : part.toLowerCase()))
    .join('')
}

/** "/{locale}/business-consulting" → "/services/business-consulting". */
function serviceSlugTarget(rest: ReadonlyArray<string>): string | null {
  if (rest.length !== 1) return null
  const slug = rest[0].toLowerCase()
  return SERVICE_SLUGS.has(slug) ? `/services/${slug}` : null
}

/**
 * Decide whether a request must be redirected to its canonical URL, answered
 * with a 404, or passed on unchanged (null).
 *
 * Rules, in order:
 *  (a) non-GET/HEAD: only the apex → www host swap;
 *  (b) app paths and root files: only the host swap; /favicon.ico → the PNG;
 *  (c) repeated and trailing slashes are dropped;
 *  (d) the first segment is the locale when it is a locale code in any case,
 *      or a bare language ("/en" → en-US);
 *  (e) an old WordPress path redirects to its successor (query dropped);
 *  (f) prefix-less: "/" → "/bs-BA", known route → "/bs-BA/…", else 404;
 *  (g) the path after the locale is lowercased, except on private routes;
 *  (h) redirect when the result differs from the request, keeping the query.
 */
export function resolveCanonicalRequest(
  url: URL,
  method: string,
): CanonicalResult {
  const production = isProductionHost(url.hostname)
  const origin = production ? ORIGIN : url.origin
  const hostSwap = (): CanonicalResult =>
    url.hostname === APEX_HOST
      ? redirect(`${ORIGIN}${url.pathname}${url.search}`)
      : null

  // (a)
  const upperMethod = method.toUpperCase()
  if (upperMethod !== 'GET' && upperMethod !== 'HEAD') return hostSwap()

  // (b)
  const { pathname } = url
  if (
    PASS_THROUGH_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    ROOT_FILES.has(pathname) ||
    CHILD_SITEMAP.test(pathname)
  ) {
    return hostSwap()
  }
  if (!production && DEV_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null
  }

  // (c)
  const segments = pathname.split('/').filter(Boolean)

  // (d)
  const segmentLocale = resolveLocaleAlias(segments[0])
  let locale: string | null = segmentLocale
  const rest = segmentLocale ? segments.slice(1) : segments

  // (e)
  const legacyTarget = lookupLegacy(`/${rest.join('/')}`) ?? serviceSlugTarget(rest)
  if (legacyTarget !== null) {
    return redirect(
      `${origin}${withLocalePath(legacyTarget, locale ?? DEFAULT_LOCALE)}`,
    )
  }

  // Files. Workers Assets serves every real public file before the Worker
  // runs, so a prefix-less file that reaches this point does not exist.
  if (FILE_EXTENSION.test(segments.at(-1) ?? '')) {
    if (pathname.toLowerCase() === '/favicon.ico') {
      return redirect(`${origin}/favicon-32.png`)
    }
    if (locale === null && production) return NOT_FOUND
    return hostSwap()
  }

  // (f)
  if (locale === null) {
    const first = rest.length > 0 ? rest[0].toLowerCase() : ''
    if (rest.length === 0) {
      locale = DEFAULT_LOCALE
    } else if (
      rest.length === 2 &&
      first === 'auth' &&
      rest[1].toLowerCase() === 'callback'
    ) {
      // OAuth: the callback must keep its exact URL and query (code, state).
      return hostSwap()
    } else if (KNOWN_TOP_SEGMENT_SET.has(first)) {
      locale = DEFAULT_LOCALE
    } else {
      return NOT_FOUND
    }
  }

  // (g)
  const restPath = rest.length > 0 ? `/${rest.join('/')}` : ''
  const canonicalRest = isPrivateRoute(restPath.toLowerCase())
    ? restPath
    : lowercasePath(restPath)
  const canonicalPath = `/${locale}${canonicalRest}`

  // (h)
  if (`${origin}${canonicalPath}` === `${url.origin}${pathname}`) return null
  return redirect(`${origin}${canonicalPath}${url.search}`)
}
