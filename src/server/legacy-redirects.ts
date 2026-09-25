/**
 * Old WordPress URLs of starthn.ba → the page that replaces them today.
 *
 * These URLs ranked (the N1 guide, /o-nama/, /kontakt/, the service pages) and
 * still get crawled and clicked, so each one gets a single permanent redirect
 * to its real successor instead of a soft 404 on the homepage.
 *
 * Keys are lowercase, without a trailing slash. Values are locale-less paths;
 * the canonical middleware (./canonical-url.ts) prefixes the request's locale,
 * or bs-BA when the URL has none.
 */
export const LEGACY_REDIRECTS: Record<string, string> = {
  '/o-nama': '/about',
  '/nas-tim': '/about',
  '/kontakt': '/contact',
  '/nase-usluge': '/services',
  '/service': '/services',
  '/karijera': '/careers',
  '/misija-vizija-vrijednosti': '/mission-vision',
  '/certifikati-priznanja': '/certificates',
  '/politika-privatnosti': '/privacy',
  '/pokretanje-biznisa-u-bih':
    '/blog/how-to-start-a-business-in-bih-a-practical-guide-tips-from-experience-with-the-n1-tv-appearance',
  '/vaznost-projekata-za-poduzetnistvo':
    '/blog/importance-of-entrepreneurship-programs',
  '/service/racunovodstvene-knjigovodstvene': '/services/bookkeeping-accounting',
  '/service/revizijske-slicne-usluge': '/services/tax-consulting',
  '/service/porezno-planiranje-savejtovanje': '/services/virtual-cfo',
  '/category/business-consulting': '/services/business-consulting',
  '/category/startup-consulting': '/services/business-consulting',
  '/category/marketing': '/blog',
  '/faqs': '/',
  '/galerija': '/about',
  '/uspjesne-price': '/about',
  '/index.html': '/',
  '/index.php': '/',
  // The old service slugs without "/service/" — Search Console shows them
  // locale-prefixed (e.g. /bs-BA/revizijske-slicne-usluge).
  '/racunovodstvene-knjigovodstvene': '/services/bookkeeping-accounting',
  '/revizijske-slicne-usluge': '/services/tax-consulting',
  '/porezno-planiranje-savejtovanje': '/services/virtual-cfo',
}

const LEGACY_MAP: ReadonlyMap<string, string> = new Map(
  Object.entries(LEGACY_REDIRECTS),
)

/** WordPress served every page again under /feed and /amp. */
const WP_SUFFIX = /\/(?:amp|feed)$/

/**
 * The locale-less target for an old WordPress path, or null.
 *
 * `restPath` is the path after any locale prefix ("/o-nama/", "/Kontakt").
 * Matching ignores case, trailing slashes and an "/amp" or "/feed" suffix, and
 * treats deeper paths under an old /service/<slug> page as that page.
 */
export function lookupLegacy(restPath: string): string | null {
  let path = restPath.toLowerCase().replace(/\/{2,}/g, '/').replace(/\/+$/, '')
  if (!path.startsWith('/')) path = `/${path}`

  const withoutSuffix = path.replace(WP_SUFFIX, '')
  // "/service/revizijske-slicne-usluge/<anything>" → that service page
  const serviceRoot = /^\/service\/[^/]+/.exec(withoutSuffix)?.[0]

  return (
    LEGACY_MAP.get(path) ??
    LEGACY_MAP.get(withoutSuffix) ??
    (serviceRoot ? LEGACY_MAP.get(serviceRoot) : undefined) ??
    null
  )
}
