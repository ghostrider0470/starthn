import { DEFAULT_LOCALE, withLocalePath } from '@/lib/i18n-utils'

/**
 * Languages that get <link rel="alternate" hreflang=""> tags and sitemap entries.
 * These are the languages you actively target for search traffic.
 * All other 130+ languages are accessible via the language switcher but
 * don't get SEO signals — this avoids diluting crawl budget and avoids
 * Google penalizing thin machine-translated content.
 */
export const SEO_PRIORITY_LOCALES = [
  'en-US',    // English (primary)
  'bs-BA',    // Bosnian
  'hr-HR',    // Croatian
  'sr-Latn',  // Serbian (Latin)
  'de-DE',    // German
  'fr-FR',    // French
  'es-ES',    // Spanish
  'it-IT',    // Italian
  'tr-TR',    // Turkish
  'ar-SA',    // Arabic
  'pt-BR',    // Portuguese
  'nl-NL',    // Dutch
  'ru-RU',    // Russian
  'ja-JP',    // Japanese
  'zh-Hans',  // Chinese (Simplified)
  'ko-KR',    // Korean
] as const

type OpenGraphType = 'website' | 'article' | 'profile'

export interface PageSeoInput {
  title: string
  description: string
  origin: string
  pathname: string
  locale: string
  imagePath?: string
  type?: OpenGraphType
  siteName?: string
  keywords?: string[]
  robots?: string
  twitterCard?: 'summary' | 'summary_large_image'
  /** Override locale used for canonical URL (e.g. DEFAULT_LOCALE for non-priority locales) */
  canonicalLocale?: string
  /** When true, omit hreflang alternate links (e.g. for non-priority locales) */
  skipAlternates?: boolean
}

export interface PageSeoDocument {
  title: string
  canonicalUrl: string
  alternateUrls: Array<{ locale: string; href: string }>
  meta: Record<string, string>
  openGraph: Record<string, string>
  twitter: Record<string, string>
}

const DEFAULT_SITE_NAME = 'Horizon Tech'
const DEFAULT_OG_IMAGE = '/clean-square.png'

function normalizePath(pathname: string): string {
  if (!pathname) return '/'
  return pathname.startsWith('/') ? pathname : `/${pathname}`
}

function toAbsoluteUrl(origin: string, path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}

function toOpenGraphLocale(locale: string): string {
  // OG locale format: language_TERRITORY (e.g. en_US, bs_BA)
  // BCP 47 codes like "en-US" convert directly to "en_US"
  return locale.replaceAll('-', '_')
}

function upsertMetaByName(name: string, content: string) {
  let node = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!node) {
    node = document.createElement('meta')
    node.setAttribute('name', name)
    document.head.appendChild(node)
  }
  node.setAttribute('content', content)
}

function upsertMetaByProperty(property: string, content: string) {
  let node = document.head.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
  if (!node) {
    node = document.createElement('meta')
    node.setAttribute('property', property)
    document.head.appendChild(node)
  }
  node.setAttribute('content', content)
}

function upsertLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`
  let node = document.head.querySelector(selector) as HTMLLinkElement | null
  if (!node) {
    node = document.createElement('link')
    node.setAttribute('rel', rel)
    if (hreflang) node.setAttribute('hreflang', hreflang)
    document.head.appendChild(node)
  }
  node.setAttribute('href', href)
}

export function buildPageSeo({
  title,
  description,
  origin,
  pathname,
  locale,
  imagePath = DEFAULT_OG_IMAGE,
  type = 'website',
  siteName = DEFAULT_SITE_NAME,
  keywords = [],
  robots = 'index,follow',
  twitterCard = 'summary_large_image',
  canonicalLocale,
  skipAlternates = false,
}: PageSeoInput): PageSeoDocument {
  const normalizedPath = normalizePath(pathname)
  const effectiveCanonicalLocale = canonicalLocale ?? locale
  const canonicalUrl = toAbsoluteUrl(origin, withLocalePath(normalizedPath, effectiveCanonicalLocale as any))
  const imageUrl = toAbsoluteUrl(origin, imagePath)
  const alternateUrls = skipAlternates
    ? []
    : [
        ...SEO_PRIORITY_LOCALES.map((priorityLocale) => ({
          locale: priorityLocale,
          href: toAbsoluteUrl(origin, withLocalePath(normalizedPath, priorityLocale)),
        })),
        {
          locale: 'x-default',
          href: toAbsoluteUrl(origin, withLocalePath(normalizedPath, DEFAULT_LOCALE)),
        },
      ]

  return {
    title,
    canonicalUrl,
    alternateUrls,
    meta: {
      description,
      robots,
      ...(keywords.length > 0 ? { keywords: keywords.join(', ') } : {}),
    },
    openGraph: {
      'og:title': title,
      'og:description': description,
      'og:type': type,
      'og:url': canonicalUrl,
      'og:image': imageUrl,
      'og:site_name': siteName,
      'og:locale': toOpenGraphLocale(locale),
    },
    twitter: {
      'twitter:card': twitterCard,
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image': imageUrl,
      'twitter:url': canonicalUrl,
    },
  }
}

export function applyPageSeo(seo: PageSeoDocument) {
  document.title = seo.title

  Object.entries(seo.meta).forEach(([name, content]) => {
    upsertMetaByName(name, content)
  })

  Object.entries(seo.openGraph).forEach(([property, content]) => {
    upsertMetaByProperty(property, content)
  })

  Object.entries(seo.twitter).forEach(([name, content]) => {
    upsertMetaByName(name, content)
  })

  upsertLink('canonical', seo.canonicalUrl)

  // Remove stale hreflang alternate links before applying new ones
  document.head
    .querySelectorAll('link[rel="alternate"][hreflang]')
    .forEach((node) => node.remove())

  seo.alternateUrls.forEach(({ locale, href }) => {
    upsertLink('alternate', href, locale)
  })
}

interface OrganizationStructuredDataInput {
  origin: string
  name?: string
  description?: string
  logoPath?: string
  sameAs?: string[]
}

export function buildOrganizationStructuredData({
  origin,
  name = DEFAULT_SITE_NAME,
  description,
  logoPath = '/clean-square.png',
  sameAs = [],
}: OrganizationStructuredDataInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url: origin,
    logo: toAbsoluteUrl(origin, logoPath),
    ...(description ? { description } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  }
}

interface BreadcrumbListInput {
  origin: string
  items: Array<{ name: string; path: string }>
}

export function buildBreadcrumbStructuredData({
  origin,
  items,
}: BreadcrumbListInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(origin, item.path),
    })),
  }
}

interface ArticleStructuredDataInput {
  origin: string
  headline: string
  description: string
  path: string
  imagePath?: string
  datePublished?: string
  dateModified?: string
}

export function buildArticleStructuredData({
  origin,
  headline,
  description,
  path,
  imagePath = DEFAULT_OG_IMAGE,
  datePublished,
  dateModified,
}: ArticleStructuredDataInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    mainEntityOfPage: toAbsoluteUrl(origin, path),
    image: [toAbsoluteUrl(origin, imagePath)],
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
  }
}

export function upsertStructuredData(id: string, data: unknown) {
  let node = document.head.querySelector(
    `script[type="application/ld+json"][data-seo-id="${id}"]`
  ) as HTMLScriptElement | null

  if (!node) {
    node = document.createElement('script')
    node.type = 'application/ld+json'
    node.setAttribute('data-seo-id', id)
    document.head.appendChild(node)
  }

  node.textContent = JSON.stringify(data)
}

export function removeStructuredData(id: string) {
  document.head
    .querySelectorAll(`script[type="application/ld+json"][data-seo-id="${id}"]`)
    .forEach((node) => node.remove())
}
