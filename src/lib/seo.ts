import { DEFAULT_LOCALE, isValidLocale, withLocalePath } from '@/lib/i18n-utils'
import {
  BRAND,
  CONTACT_EMAIL,
  COUNTRY,
  GBP_NAME,
  GOOGLE_BUSINESS_PROFILE_URL,
  LOCALITY,
  PHONE_INTL,
  POSTAL_CODE,
  REGION,
  SOCIAL_PROFILES,
  STREET,
} from '@/lib/business'

// Kept for existing importers; the value lives in '@/lib/business'.
export { GOOGLE_BUSINESS_PROFILE_URL }

/**
 * The only indexable languages: they get index,follow, hreflang alternates and
 * sitemap entries. Start HN is a local Ilidža/Sarajevo agency, so search effort
 * goes to Bosnian (home), English and Croatian.
 *
 * Every other locale in LANGUAGES (sr-Latn, de-DE, fr-FR, …) stays reachable
 * for visitors through the language switcher, but is noindex,follow, is never
 * listed in hreflang and has no sitemap (its /sitemap-<code>.xml returns 410).
 * That keeps thin machine translations out of the index and the crawl budget.
 */
export const SEO_PRIORITY_LOCALES = [
  'bs-BA',    // Bosnian (primary, default locale)
  'en-US',    // English
  'hr-HR',    // Croatian
] as const

/**
 * App-only routes (auth, account, admin) that must never be indexed. Single
 * source of truth for the server-rendered robots meta and public/robots.txt
 * (a test keeps robots.txt in sync with this list).
 */
export const PRIVATE_ROUTE_PREFIXES = [
  '/admin',
  '/auth',
  '/confirm-email',
  '/dashboard',
  '/first-time-setup',
  '/forgot-password',
  '/login',
  '/my-page',
  '/profile',
  '/register',
  '/reset-password',
  '/unauthorized',
  '/workspace',
] as const

/**
 * Pages whose content is written only in some of the indexable locales
 * (locale-stripped path → those locales). In every other locale the page
 * shows one of these texts, so there it is noindex,follow, has no hreflang,
 * is not listed in any other locale's hreflang and is left out of the
 * sitemap. The legal pages exist in Bosnian and English only (Croatian shows
 * the Bosnian text).
 */
export const PAGE_CONTENT_LOCALES: Readonly<
  Record<string, ReadonlyArray<string>>
> = {
  '/privacy': ['bs-BA', 'en-US'],
  '/terms': ['bs-BA', 'en-US'],
}

/**
 * True when `locale` is an indexable locale that has its own content for the
 * page (see SEO_PRIORITY_LOCALES and PAGE_CONTENT_LOCALES). Private routes
 * are handled separately (isPrivateRoute).
 */
export function isIndexableLocaleForPage(
  normalizedPath: string,
  locale: string,
): boolean {
  if (!(SEO_PRIORITY_LOCALES as ReadonlyArray<string>).includes(locale)) {
    return false
  }
  const contentLocales = PAGE_CONTENT_LOCALES[normalizedPath] as
    | ReadonlyArray<string>
    | undefined
  return !contentLocales || contentLocales.includes(locale)
}

/** True for a locale-stripped path under one of PRIVATE_ROUTE_PREFIXES. */
export function isPrivateRoute(normalizedPath: string): boolean {
  // Case-insensitive: /bs-BA/LOGIN must be noindex too, and the canonical
  // middleware and {-$locale} beforeLoad keep private paths' case as-is.
  const path = normalizedPath.toLowerCase()
  return PRIVATE_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )
}

/**
 * Locale-stripped public path → key of its localized SEO strings
 * (seo:pages.<key>.title/description) and of its breadcrumb label
 * (common:breadcrumbs.<key>). Also the list of pages that get a breadcrumb.
 */
export const SEO_PAGE_KEY: Record<string, string> = {
  '/': 'home',
  '/about': 'about',
  '/services': 'services',
  '/services/bookkeeping-accounting': 'serviceBookkeeping',
  '/services/tax-consulting': 'serviceTaxConsulting',
  '/services/virtual-cfo': 'serviceVirtualCfo',
  '/services/business-consulting': 'serviceBusinessConsulting',
  '/services/financial-reporting': 'serviceFinancialReporting',
  '/services/education-courses': 'serviceEducation',
  '/careers': 'careers',
  '/certificates': 'certificates',
  '/mission-vision': 'missionVision',
  '/contact': 'contact',
  '/blog': 'blog',
  '/privacy': 'privacy',
  '/terms': 'terms',
}

const DEFAULT_OG_IMAGE = '/og-image.png'

/**
 * Absolute origin used for server-rendered canonical / og:url / hreflang.
 * Always the production www host — canonical URLs must point at production
 * regardless of the host that served the request (apex redirects to www, and
 * dev/preview hosts should never appear in a canonical tag).
 */
export const SEO_ORIGIN = 'https://www.starthn.ba'

const BUSINESS_ID = `${SEO_ORIGIN}/#business`
const WEBSITE_ID = `${SEO_ORIGIN}/#website`

/**
 * Open Graph locale per supported locale. OG wants language_TERRITORY, so
 * script subtags need an explicit territory (sr-Latn → sr_RS, zh-Hans →
 * zh_CN), and Facebook uses ar_AR for Arabic.
 */
export const OG_LOCALE_MAP: Record<string, string> = {
  'bs-BA': 'bs_BA',
  'en-US': 'en_US',
  'hr-HR': 'hr_HR',
  'sr-Latn': 'sr_RS',
  'de-DE': 'de_DE',
  'fr-FR': 'fr_FR',
  'es-ES': 'es_ES',
  'it-IT': 'it_IT',
  'tr-TR': 'tr_TR',
  'ar-SA': 'ar_AR',
  'pt-BR': 'pt_BR',
  'nl-NL': 'nl_NL',
  'ru-RU': 'ru_RU',
  'ja-JP': 'ja_JP',
  'zh-Hans': 'zh_CN',
  'ko-KR': 'ko_KR',
}

export function toOpenGraphLocale(locale: string): string {
  return OG_LOCALE_MAP[locale] ?? locale.replaceAll('-', '_')
}

export interface LocalizedSeoHead {
  /** Self-referencing canonical (the default locale's URL for an unknown code). */
  canonicalUrl: string
  /** hreflang alternates incl. x-default; empty for noindex locales and private routes. */
  alternates: Array<{ hreflang: string; href: string }>
  /** noindex,nofollow for private routes; else index,follow for indexable locales (isIndexableLocaleForPage), noindex,follow for the rest. */
  robots: string
  /** og:locale for the page's locale (e.g. bs_BA). */
  ogLocale: string
}

/**
 * Computes the server-renderable SEO head signals (canonical, hreflang
 * alternates, robots, og:locale) for a page. Pure and SSR-safe — no
 * DOM/window access — so it can run inside a route loader during SSR.
 *
 * Priority locales self-canonicalize and emit the hreflang set; the other
 * visible locales self-canonicalize too (decision D1) but are noindex,follow
 * with no alternates. Private routes never carry alternates.
 *
 * @param normalizedPath locale-stripped path (e.g. "/blog/my-post", "/")
 * Pages listed in PAGE_CONTENT_LOCALES are indexable, and listed in
 * hreflang, only in the locales that have their own text.
 *
 * @param allowedLocales when given (blog posts), only these locales are
 *   listed in hreflang, so a post links only to languages it exists in
 */
export function buildLocalizedSeoHead(
  normalizedPath: string,
  locale: string,
  allowedLocales?: ReadonlyArray<string> | null,
): LocalizedSeoHead {
  // A priority locale can still be noindex for a page it has no content of
  // its own for (PAGE_CONTENT_LOCALES), e.g. /hr-HR/privacy.
  const isIndexable = isIndexableLocaleForPage(normalizedPath, locale)
  const isPrivate = isPrivateRoute(normalizedPath)
  // Every known locale is self-canonical (decision D1): the 13 visible
  // non-priority locales are noindex,follow and carry no hreflang, but they
  // must not canonicalize to another language. Only an unknown code falls
  // back to the default locale.
  const canonicalLocale = isValidLocale(locale) ? locale : DEFAULT_LOCALE
  const canonicalUrl = toAbsoluteUrl(
    SEO_ORIGIN,
    withLocalePath(normalizedPath, canonicalLocale),
  )

  let alternates: LocalizedSeoHead['alternates'] = []
  if (isIndexable && !isPrivate) {
    const hreflangLocales: ReadonlyArray<string> = SEO_PRIORITY_LOCALES.filter(
      (priorityLocale) =>
        isIndexableLocaleForPage(normalizedPath, priorityLocale) &&
        (!allowedLocales || allowedLocales.includes(priorityLocale)),
    )
    if (hreflangLocales.length > 0) {
      const xDefaultLocale = hreflangLocales.includes(DEFAULT_LOCALE)
        ? DEFAULT_LOCALE
        : hreflangLocales[0]
      alternates = [
        ...hreflangLocales.map((priorityLocale) => ({
          hreflang: priorityLocale,
          href: toAbsoluteUrl(
            SEO_ORIGIN,
            withLocalePath(normalizedPath, priorityLocale),
          ),
        })),
        {
          hreflang: 'x-default',
          href: toAbsoluteUrl(
            SEO_ORIGIN,
            withLocalePath(normalizedPath, xDefaultLocale),
          ),
        },
      ]
    }
  }

  return {
    canonicalUrl,
    alternates,
    robots: isPrivate
      ? 'noindex,nofollow'
      : isIndexable
        ? 'index,follow'
        : 'noindex,follow',
    ogLocale: toOpenGraphLocale(canonicalLocale),
  }
}

function toAbsoluteUrl(origin: string, path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Shortens text for a meta description: whitespace collapsed, cut at the last
 * word boundary so the result (with its '…') is at most `max` characters.
 */
export function truncateAtWord(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  const base = lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut
  return `${base.replace(/[\s,;:.–—-]+$/, '')}…`
}

/**
 * JSON-LD for a head() `scripts` entry. `<` is escaped so no string value
 * (a post title, say) can close the script element.
 */
export const jsonLd = (obj: unknown) => ({
  type: 'application/ld+json',
  children: JSON.stringify(obj).replace(/</g, '\\u003c'),
})

/**
 * Local-business data for Google. Name, address, phone, coordinates and hours
 * must match the Google Business Profile exactly — Maps ranking leans on that
 * consistency. The values live in '@/lib/business'; update the profile and
 * that file together.
 */
export function buildLocalBusinessStructuredData(origin: string = SEO_ORIGIN) {
  return {
    '@context': 'https://schema.org',
    '@type': 'AccountingService',
    '@id': `${origin}/#business`,
    name: GBP_NAME,
    alternateName: [BRAND, 'START HN'],
    description:
      'Računovodstvena agencija sa Ilidže (Sarajevo): knjigovodstvo, obračun plata, PDV, porezno savjetovanje i virtualni CFO za firme, obrte i udruženja.',
    url: `${origin}/${DEFAULT_LOCALE}`,
    logo: toAbsoluteUrl(origin, '/clean-square.png'),
    image: toAbsoluteUrl(origin, DEFAULT_OG_IMAGE),
    telephone: PHONE_INTL,
    email: CONTACT_EMAIL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: STREET,
      addressLocality: LOCALITY,
      postalCode: POSTAL_CODE,
      addressRegion: REGION,
      addressCountry: COUNTRY,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 43.8313652,
      longitude: 18.3033777,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '16:00',
      },
    ],
    areaServed: { '@type': 'Country', name: 'Bosnia and Herzegovina' },
    hasMap: GOOGLE_BUSINESS_PROFILE_URL,
    sameAs: [GOOGLE_BUSINESS_PROFILE_URL, ...SOCIAL_PROFILES],
  }
}

/**
 * WebSite entity, so Google shows 'Start HN' as the site name (decision D12:
 * the Google Business Profile name is an alternate). No SearchAction: the
 * site has no search results page.
 */
export function buildWebSiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: BRAND,
    alternateName: ['START HN', GBP_NAME],
    url: `${SEO_ORIGIN}/${DEFAULT_LOCALE}`,
    inLanguage: DEFAULT_LOCALE,
    publisher: { '@id': BUSINESS_ID },
  }
}

/** Service entity for a service page. No Offer or price (decision D8). */
export function buildServiceStructuredData({
  locale,
  canonicalUrl,
  name,
  description,
}: {
  locale: string
  canonicalUrl: string
  name: string
  description: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${canonicalUrl}#service`,
    name,
    description,
    url: canonicalUrl,
    provider: { '@id': BUSINESS_ID },
    areaServed: { '@type': 'Country', name: 'Bosnia and Herzegovina' },
    inLanguage: locale,
  }
}

export function buildBlogPostingStructuredData({
  canonicalUrl,
  headline,
  description,
  image,
  datePublished,
  dateModified,
  authorName,
  locale,
}: {
  canonicalUrl: string
  headline: string
  description?: string | null
  /** Absolute image URL. */
  image?: string | null
  datePublished?: string | null
  dateModified?: string | null
  authorName?: string | null
  locale: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${canonicalUrl}#article`,
    mainEntityOfPage: canonicalUrl,
    url: canonicalUrl,
    headline,
    ...(description ? { description } : {}),
    ...(image ? { image: [image] } : {}),
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified || datePublished
      ? { dateModified: dateModified || datePublished }
      : {}),
    // Without a named author the business itself is the author.
    author: authorName
      ? { '@type': 'Person', name: authorName }
      : { '@id': BUSINESS_ID },
    publisher: { '@id': BUSINESS_ID },
    inLanguage: locale,
  }
}

/**
 * BreadcrumbList for a public page: Home > … > page, labels from
 * common:breadcrumbs.<SEO_PAGE_KEY>. Returns null for the home page, private
 * routes, unknown paths (every step must be a known page) and when any label
 * is missing in this locale — a breadcrumb never shows a raw key.
 *
 * @param t label lookup for the page's locale; return null/undefined (or the
 *   key itself, as i18next does) when the label does not exist
 * @param leaf an extra last item (a blog post under /blog)
 */
export function buildBreadcrumbTrail(
  normalizedPath: string,
  locale: string,
  t: (key: string) => string | null | undefined,
  leaf?: { name: string; path: string },
) {
  if (isPrivateRoute(normalizedPath)) return null
  const pageLocale = isValidLocale(locale) ? locale : DEFAULT_LOCALE

  const label = (pageKey: string): string | null => {
    const key = `breadcrumbs.${pageKey}`
    const value = t(key)
    return value && value !== key && !value.endsWith(`:${key}`) ? value : null
  }

  const items: Array<{ name: string; path: string }> = []
  const homeLabel = label('home')
  if (!homeLabel) return null
  items.push({ name: homeLabel, path: '/' })

  let currentPath = ''
  for (const segment of normalizedPath.split('/').filter(Boolean)) {
    currentPath += `/${segment}`
    const pageKey = SEO_PAGE_KEY[currentPath]
    if (!pageKey) return null
    const name = label(pageKey)
    if (!name) return null
    items.push({ name, path: currentPath })
  }

  if (leaf) items.push(leaf)
  if (items.length < 2) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(SEO_ORIGIN, withLocalePath(item.path, pageLocale)),
    })),
  }
}
