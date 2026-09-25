/**
 * Detection for the spam URLs injected by a prior site compromise, and for the
 * WordPress / shop-template leftovers of the old site.
 *
 * These paths must be served a 410 Gone (see src/server.ts) so Google deindexes
 * them. The matchers are deliberately narrow: they target the spam URL *shape*
 * and must never match a legitimate route (legit pages are word slugs, never
 * letter+digit IDs, and the site has no /items/ paths). The old WordPress pages
 * that still have a real successor are NOT here — they 301 through
 * ./legacy-redirects.ts, and spam-guard.test.ts checks the two never overlap.
 */

const ITEMS_PATH = /(^|\/)items\//i

/**
 * Bare injected IDs: an uppercase letter followed by 6+ digits as the final
 * path segment, optionally locale-prefixed.
 * Matches: /en-US/B471837416, /bs/Y156399317, /zh-Hans/X1234567, /B471837416
 */
const INJECTED_ID = /^(?:\/[A-Za-z]{2,3}(?:-[A-Za-z]{2,4})?)?\/[A-Z]\d{6,}\/?$/

/**
 * Old WordPress-era taxonomy junk still being recrawled: "cate-<n>",
 * "cate--<n>", "cate-<n>-<n>…" segments, and the theme's
 * /case-studie-categorie/ archive.
 * Matches: /cate-101, /cate--33, /cate-136-177, /en-US/cate-10-40,
 *          /case-studie-categorie/coportate
 */
const WP_TAXONOMY =
  /^(?:\/[A-Za-z]{2,3}(?:-[A-Za-z]{2,4})?)?\/(?:cate-+\d*(?:-\d+)*\/?$|case-studie-categorie(?:\/|$))/i

/**
 * Optional locale prefix for the matchers below: "bs", "en-US", "sr-Latn",
 * "zh-Hans" and case variants. Deliberately stricter than the one above so
 * that /api/… and /img/… can never pass for a locale.
 */
const LOCALE_PREFIX = String.raw`(?:\/[a-z]{2}(?:-[a-z]{2,4})?)?`

/** Top-level sections of the old WordPress theme and the injected shop. */
const SPAM_ROOTS = new RegExp(
  `^${LOCALE_PREFIX}\\/(?:shop|contents|toyu|reserve|information|pxl-template|portfolio|industries|case-studies|service-category|tag|author|wp-admin|wp-includes|wp-content|wp-json)(?:\\/|$)`,
  'i',
)

/** Distinctive leaves of the injected Japanese shop pages. */
const SHOP_LEAVES = new RegExp(
  `^${LOCALE_PREFIX}\\/(?:top\\/CKmSpSfTop|e\\/e\\d{6,}|storeSearch(?:\\/|$)|userreview(?:\\/|$)|event\\/kansyasai|renga(?:\\/|$)|pg(?:\\/|$)|order(?:\\/|$)|customer\\/menu|cart\\/cart|category\\/categorylist|privacy_policy\\.html)`,
  'i',
)

/** WordPress feeds at the site root: /feed, /comments/feed, /en-US/feed. */
const WP_FEED = new RegExp(`^${LOCALE_PREFIX}\\/(?:comments\\/)?feed\\/?$`, 'i')

/** WordPress pagination: /page/2, /blog/page/3, /category/x/page/2. */
const WP_PAGINATION = /(?:^|\/)page\/\d+(?:\/|$)/i

/** WordPress date archives: /2019/05, /2019/05/hello-world/. */
const WP_DATE_ARCHIVE = /^\/\d{4}\/\d{2}(?:\/|$)/

/**
 * Any PHP script (wp-login.php, xmlrpc.php, …). /index.php, bare or under a
 * locale prefix (/bs-BA/index.php, /en/index.php), 301s to the homepage
 * instead, like /index.html (see ./legacy-redirects.ts).
 */
const PHP_SCRIPT = /\.php$/i
const INDEX_PHP = /^(?:\/[A-Za-z]{2,3}(?:-[A-Za-z]{2,4})?)?\/index\.php$/i

/** WordPress / Yoast sitemaps. Never /sitemap.xml or /sitemap-<locale>.xml. */
const WP_SITEMAP = /(?:^|\/)(?:sitemap_index|wp-sitemap[^/]*|[a-z_-]+-sitemap\d*)\.xml$/i

/**
 * Old /service/<slug> pages. The three real service slugs 301 to their new
 * pages (see ./legacy-redirects.ts); the bare /service 301s to /services.
 */
const OLD_SERVICE_PAGE =
  /^\/service\/(?!(?:racunovodstvene-knjigovodstvene|porezno-planiranje-savejtovanje|revizijske-slicne-usluge)(?:\/|$))[^/]+/i

/**
 * Exact spam paths (lowercase, no trailing slash): the hacked /pw entry point
 * and the gambling posts injected into the old WordPress site.
 */
const EXACT_SPAM_PATHS = new Set([
  '/pw',
  '/1xbet-live-casino-play-using-real-live-retailers-in-finland',
  '/w-jaki-sposob-bonus-za-rejestracje-w-mostbet-wplywa-na-zaklady',
  '/zastosowanie-optymalnej-strategii-poczatkowej-w-grach-kasynowych-vox',
  '/wie-verwalten-sie-ihren-bankroll-beim-sportwetten-ohne-oasis',
  '/offizielles-plinko-in-deutschland-spielen-97-56-rtp',
  '/kazino-pinko-legendy-i-mify-po-otzyvam',
  '/jak-zarabiac-na-bonusach-w-mostbet-analiza-ryzyka-i-zysku',
  '/die-zukunft-der-wettanbieter-ohne-oasis-im-wettmarkt',
  '/istoriia-pinko-kazino-ofitsialnyi-sait-i-ego-razvitie',
  '/rost-sportivnykh-stavok-na-1vin-tendentsii-i-perspektivy',
  '/wie-man-sichere-nicht-lizenzierte-wettanbieter-in-deutschland-erkennt-die-glucksspielaufsicht-verstehen',
  '/obzor-prilozheniia-1win-skachat-i-ego-osobennosti',
  '/in-depth-look-at-roulette-variants-in-best-online-casinos-in-canada',
  '/pinko-kazino-ofitsialnyi-sait-kak-otkliuchit-reklamu-i-uvedomleniia',
])

function isExactSpamPath(pathname: string): boolean {
  const path = pathname.toLowerCase().replace(/\/+$/, '')
  // WordPress also served every post under /feed and /amp.
  return (
    EXACT_SPAM_PATHS.has(path) ||
    EXACT_SPAM_PATHS.has(path.replace(/\/(?:amp|feed)$/, ''))
  )
}

/** App-owned prefixes (API, image proxy, build assets) are never WordPress. */
const APP_PREFIX = /^\/(?:api|img|assets|locales|cdn-cgi|_serverFn)(?:\/|$)/i

export function isHackSpam(pathname: string): boolean {
  if (
    ITEMS_PATH.test(pathname) ||
    INJECTED_ID.test(pathname) ||
    WP_TAXONOMY.test(pathname)
  ) {
    return true
  }
  if (APP_PREFIX.test(pathname)) return false

  return (
    SPAM_ROOTS.test(pathname) ||
    SHOP_LEAVES.test(pathname) ||
    WP_FEED.test(pathname) ||
    WP_PAGINATION.test(pathname) ||
    WP_DATE_ARCHIVE.test(pathname) ||
    (PHP_SCRIPT.test(pathname) && !INDEX_PHP.test(pathname)) ||
    WP_SITEMAP.test(pathname) ||
    OLD_SERVICE_PAGE.test(pathname) ||
    isExactSpamPath(pathname)
  )
}
