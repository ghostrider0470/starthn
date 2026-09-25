/**
 * Security response headers for everything the Worker answers: SSR pages,
 * edge-cache hits, the canonical 301s, the 404 page, the spam 410s, sitemaps
 * and /img. Static files never reach the Worker (Workers Assets serves them
 * first), so public/_headers sends the same set for those; a test keeps the
 * two in sync.
 *
 * /api/* gets the same set, except that it may never be framed at all
 * (X-Frame-Options: DENY, frame-ancestors 'none'). Hono secureHeaders in
 * src/server.ts adds its cross-origin headers there, but leaves HSTS,
 * X-Frame-Options, Referrer-Policy and X-Content-Type-Options to this module,
 * so every response carries one consistent value for each.
 *
 * No script/style Content-Security-Policy: Turnstile, GA4 and Clarity (after
 * consent) and TanStack's inline hydration scripts would all need allow-listing
 * and nonces. The only CSP directive sent is frame-ancestors, which says who
 * may frame this site and never restricts what the page itself loads.
 */

const HSTS_MAX_AGE = 'max-age=31536000'

/**
 * Header name → value. Permissions-Policy leaves out "interest-cohort": FLoC
 * was withdrawn in 2022, and a browser that does not know a feature logs an
 * "Error with Permissions-Policy header: Unrecognized feature" console message
 * on every page load.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Strict-Transport-Security': `${HSTS_MAX_AGE}; includeSubDomains`,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "frame-ancestors 'self'",
}

/**
 * The apex host. HSTS with includeSubDomains sent from here would also pin
 * mail., webmail. and ftp.starthn.ba to HTTPS, and those have no valid
 * certificate (checked 2026-09-25). Cloudflare redirects the apex to www
 * before the Worker runs, so this only matters if that rule ever goes away.
 */
const APEX_HOST = 'starthn.ba'

/** /api responses: JSON that no page should ever frame. */
export const API_HEADER_OVERRIDES: Readonly<Record<string, string>> = {
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
}

/** The security headers for a response to `url`. */
export function securityHeadersFor(url: URL): Record<string, string> {
  const headers = isApiPath(url.pathname)
    ? { ...SECURITY_HEADERS, ...API_HEADER_OVERRIDES }
    : { ...SECURITY_HEADERS }
  if (url.hostname.toLowerCase() === APEX_HOST) {
    headers['Strict-Transport-Security'] = HSTS_MAX_AGE
  }
  return headers
}

/** /api and /api/* (see API_HEADER_OVERRIDES). */
export function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/')
}

/**
 * `response` with the security headers added. A header the response already
 * sets is kept. Returns a new Response, because responses from fetch(),
 * Response.redirect() and the Cache API have immutable headers. WebSocket
 * upgrades are returned untouched.
 */
export function withSecurityHeaders(
  request: Request,
  response: Response,
): Response {
  const url = new URL(request.url)
  if (response.status === 101) return response

  const secured = new Response(response.body, response)
  for (const [name, value] of Object.entries(securityHeadersFor(url))) {
    if (!secured.headers.has(name)) secured.headers.set(name, value)
  }
  return secured
}
