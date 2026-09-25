// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  SEO_PAGE_KEY,
  localizedPageHead,
  localizedServiceHead,
  localizedSiteStructuredData,
  mergeSeoFallback,
  resolveSeoStrings,
  seoFallbackChain,
  seoFallbackLocale,
  servicePricePlans,
  translateExact,
} from './seo-meta'
import {
  SEO_ORIGIN,
  SEO_PRIORITY_LOCALES,
  buildBlogPostingStructuredData,
  buildBreadcrumbTrail,
  buildWebSiteStructuredData,
  jsonLd,
  serviceStructuredDataId,
} from './seo'
import { SERVICE_IDS, SERVICE_ROUTES } from './service-routes'
import i18n from '@/i18n'

const LOCALES_DIR = join(process.cwd(), 'public', 'locales')

function readBundle(locale: string, ns: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(LOCALES_DIR, locale, `${ns}.json`), 'utf8'))
}

/** Every page with a localized head, plus the 404 title. */
const PAGE_KEYS = [...new Set([...Object.values(SEO_PAGE_KEY), 'notFound'])]

beforeAll(() => {
  for (const locale of SEO_PRIORITY_LOCALES) {
    i18n.addResourceBundle(locale, 'seo', readBundle(locale, 'seo'), true, true)
    i18n.addResourceBundle(locale, 'services', readBundle(locale, 'services'), true, true)
    i18n.addResourceBundle(locale, 'common', readBundle(locale, 'common'), true, true)
  }
})

describe('SEO strings of the indexable locales', () => {
  for (const locale of SEO_PRIORITY_LOCALES) {
    describe(locale, () => {
      for (const pageKey of PAGE_KEYS) {
        it(`${pageKey}: branded title ≤60 chars, description 70–160 chars`, () => {
          const { title, description } = resolveSeoStrings(pageKey, locale)
          // The page's own strings, not a fallback
          expect(title).toBe(
            i18n.getResource(locale, 'seo', `pages.${pageKey}.title`),
          )
          expect(title).toContain('Start HN')
          expect(title.length).toBeLessThanOrEqual(60)
          expect(description.length).toBeGreaterThanOrEqual(70)
          expect(description.length).toBeLessThanOrEqual(160)
          expect(title.startsWith('pages.')).toBe(false)
          expect(description.startsWith('pages.')).toBe(false)
        })
      }

      it('has a unique title per page', () => {
        const titles = PAGE_KEYS.map((key) => resolveSeoStrings(key, locale).title)
        expect(new Set(titles).size).toBe(titles.length)
      })
    })
  }
})

describe('fallbacks', () => {
  it('picks bs-BA for Bosnian, Croatian and Serbian, en-US for the rest', () => {
    expect(seoFallbackLocale('hr-HR')).toBe('bs-BA')
    expect(seoFallbackLocale('sr-Latn')).toBe('bs-BA')
    expect(seoFallbackLocale('bs-BA')).toBe('bs-BA')
    expect(seoFallbackLocale('de-DE')).toBe('en-US')
    expect(seoFallbackLocale('zh-Hans')).toBe('en-US')
    expect(seoFallbackChain('de-DE')).toEqual(['de-DE', 'en-US', 'bs-BA'])
    expect(seoFallbackChain('bs-BA')).toEqual(['bs-BA'])
  })

  it('falls back to en-US for a non-Balkan locale missing a key', () => {
    i18n.addResourceBundle(
      'fr-FR',
      'seo',
      { pages: { about: { title: 'À propos | Start HN', description: 'Description française' } } },
      true,
      true,
    )
    expect(resolveSeoStrings('about', 'fr-FR').title).toBe('À propos | Start HN')
    expect(resolveSeoStrings('serviceVirtualCfo', 'fr-FR')).toEqual(
      resolveSeoStrings('serviceVirtualCfo', 'en-US'),
    )
  })

  it('falls back to bs-BA for Serbian', () => {
    expect(resolveSeoStrings('contact', 'sr-Latn')).toEqual(
      resolveSeoStrings('contact', 'bs-BA'),
    )
  })

  it('uses the default locale for an unknown locale param', () => {
    expect(resolveSeoStrings('home', undefined)).toEqual(resolveSeoStrings('home', 'bs-BA'))
    expect(resolveSeoStrings('home', 'xx-XX')).toEqual(resolveSeoStrings('home', 'bs-BA'))
  })

  it('never returns a raw key', () => {
    const unknownPage = resolveSeoStrings('noSuchPage', 'ko-KR')
    expect(unknownPage.title).not.toMatch(/^(pages|default)\./)
    expect(unknownPage.title).toContain('Start HN')
    const nothingLoaded = resolveSeoStrings('noSuchPage', 'ja-JP')
    expect(nothingLoaded.title).not.toMatch(/^(pages|default)\./)
    expect(nothingLoaded.description).not.toMatch(/^(pages|default)\./)
  })

  it('mergeSeoFallback fills only the missing keys, with cloned objects', () => {
    i18n.addResourceBundle(
      'it-IT',
      'seo',
      { pages: { about: { title: 'Chi siamo | Start HN', description: 'Descrizione italiana' } } },
      true,
      true,
    )
    mergeSeoFallback('it-IT')

    // Own string kept, missing strings copied from en-US
    expect(i18n.getResource('it-IT', 'seo', 'pages.about.title')).toBe('Chi siamo | Start HN')
    const enTitle = i18n.getResource('en-US', 'seo', 'pages.serviceBookkeeping.title')
    expect(i18n.getResource('it-IT', 'seo', 'pages.serviceBookkeeping.title')).toBe(enTitle)

    // The page locale's store alone now answers (as on the client after hydration)
    const itBundle = i18n.getResourceBundle('it-IT', 'seo') as {
      pages: Record<string, { title: string }>
    }
    itBundle.pages.serviceBookkeeping.title = 'changed'
    expect(i18n.getResource('en-US', 'seo', 'pages.serviceBookkeeping.title')).toBe(enTitle)
  })
})

describe('localizedPageHead', () => {
  it('emits title, description, Open Graph and Twitter strings', () => {
    const { title, description } = resolveSeoStrings('about', 'bs-BA')
    expect(localizedPageHead('about', 'bs-BA')).toEqual({
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
    })
  })

  it('adds robots only when asked', () => {
    const { meta } = localizedPageHead('privacy', 'hr-HR', { robots: 'noindex,follow' })
    expect(meta.at(-1)).toEqual({ name: 'robots', content: 'noindex,follow' })
  })

  it('differs per locale', () => {
    const titles = SEO_PRIORITY_LOCALES.map(
      (locale) => (localizedPageHead('services', locale).meta[0] as { title: string }).title,
    )
    expect(new Set(titles).size).toBe(SEO_PRIORITY_LOCALES.length)
  })
})

describe('localizedServiceHead', () => {
  it('adds Service JSON-LD named from the services namespace', () => {
    const head = localizedServiceHead('bookkeeping', 'bs-BA')
    expect(head.meta[0]).toEqual({
      title: resolveSeoStrings('serviceBookkeeping', 'bs-BA').title,
    })
    const data = JSON.parse(head.scripts[0].children)
    expect(head.scripts[0].type).toBe('application/ld+json')
    expect(data['@type']).toBe('Service')
    expect(data.name).toBe(i18n.getResource('bs-BA', 'services', 'items.bookkeeping.title'))
    expect(data.description).toBe(
      i18n.getResource('bs-BA', 'services', 'items.bookkeeping.shortDescription'),
    )
    expect(data['@id']).toBe(`${SEO_ORIGIN}/bs-BA/services/bookkeeping-accounting#service`)
    expect(data.inLanguage).toBe('bs-BA')
  })
})

// ---------------------------------------------------------------------------
// Strict JSON-LD validation of every block the public pages emit.
// ---------------------------------------------------------------------------

type JsonLdScript = { type: string; children: string }
type JsonNode = Record<string, unknown>

/** The only schema.org types the site may emit. */
const ALLOWED_TYPES = new Set([
  'AccountingService',
  'WebSite',
  'Service',
  'BlogPosting',
  'BreadcrumbList',
  'ListItem',
  'PostalAddress',
  'GeoCoordinates',
  'OpeningHoursSpecification',
  'City',
  'AdministrativeArea',
  'Country',
  'PropertyValue',
  'OfferCatalog',
  'Offer',
  'UnitPriceSpecification',
  'Person',
])

/** Owner decisions: no review/rating, founder, FAQ markup; no priceRange. */
const BANNED_PROPS = ['aggregateRating', 'review', 'founder', 'priceRange']

/** Required properties per type (Google + schema.org, plus our own rules). */
const REQUIRED: Record<string, ReadonlyArray<string>> = {
  AccountingService: [
    '@id', 'name', 'legalName', 'description', 'url', 'logo', 'image',
    'telephone', 'email', 'address', 'geo', 'openingHoursSpecification',
    'areaServed', 'taxID', 'identifier', 'hasOfferCatalog', 'hasMap', 'sameAs',
  ],
  WebSite: ['@id', 'name', 'url', 'inLanguage', 'publisher'],
  Service: [
    '@id', 'name', 'serviceType', 'description', 'url', 'provider',
    'areaServed', 'inLanguage',
  ],
  BlogPosting: [
    '@id', 'headline', 'url', 'mainEntityOfPage', 'image', 'datePublished',
    'dateModified', 'author', 'publisher', 'isPartOf', 'inLanguage',
  ],
  BreadcrumbList: ['itemListElement'],
  ListItem: ['position', 'name', 'item'],
  PostalAddress: [
    'streetAddress', 'addressLocality', 'postalCode', 'addressRegion',
    'addressCountry',
  ],
  GeoCoordinates: ['latitude', 'longitude'],
  OpeningHoursSpecification: ['dayOfWeek', 'opens', 'closes'],
  City: ['name'],
  AdministrativeArea: ['name'],
  Country: ['name'],
  PropertyValue: ['propertyID', 'value'],
  OfferCatalog: ['itemListElement'],
  Offer: [],
  UnitPriceSpecification: ['minPrice', 'priceCurrency', 'unitCode'],
  Person: ['name'],
}

/** Properties whose string values must be absolute https URLs. */
const URL_PROPS = new Set([
  '@id', 'url', 'mainEntityOfPage', 'item', 'logo', 'image', 'hasMap', 'sameAs',
])

/** An i18n key rendered instead of its text ("items.bookkeeping.title"). */
const RAW_KEY = /^[a-z][\w-]*(?:\.[\w-]+)+$/

function walkJsonLd(node: unknown, path: string, isTop = false): void {
  if (Array.isArray(node)) {
    expect(node.length, `${path}: empty array`).toBeGreaterThan(0)
    node.forEach((item, i) => walkJsonLd(item, `${path}[${i}]`))
    return
  }
  if (node === null || node === undefined) {
    throw new Error(`${path}: ${String(node)} value`)
  }
  if (typeof node === 'string') {
    expect(node.length, `${path}: empty string`).toBeGreaterThan(0)
    expect(node.trim(), `${path}: untrimmed`).toBe(node)
    expect(node, `${path}: raw i18n key`).not.toMatch(RAW_KEY)
    return
  }
  if (typeof node === 'number') {
    expect(Number.isFinite(node), path).toBe(true)
    return
  }
  if (typeof node !== 'object') return

  const obj = node as JsonNode
  const keys = Object.keys(obj)
  if (!isTop) expect(keys, `${path}: nested @context`).not.toContain('@context')
  for (const key of keys) {
    expect(BANNED_PROPS, `${path}.${key} is banned`).not.toContain(key)
  }

  const type = obj['@type']
  if (type === undefined) {
    // A node reference carries nothing but its @id.
    expect(keys, `${path}: untyped node that is not a reference`).toEqual(['@id'])
  } else {
    expect(typeof type, `${path}.@type`).toBe('string')
    expect(ALLOWED_TYPES.has(type as string), `${path}: @type ${String(type)}`).toBe(
      true,
    )
    for (const prop of REQUIRED[type as string]) {
      expect(obj, `${path} (${String(type)}) needs ${prop}`).toHaveProperty(prop)
    }
    if (type === 'Offer') {
      const isCatalogEntry = 'itemOffered' in obj
      const isPricedOffer =
        'name' in obj && 'priceCurrency' in obj && 'priceSpecification' in obj
      expect(isCatalogEntry || isPricedOffer, `${path}: incomplete Offer`).toBe(true)
    }
  }

  for (const [key, value] of Object.entries(obj)) {
    if (URL_PROPS.has(key)) {
      for (const url of [value].flat()) {
        if (typeof url === 'string') {
          expect(url, `${path}.${key}`).toMatch(/^https:\/\/[^\s<>"]+$/)
        }
      }
    }
    walkJsonLd(value, `${path}.${key}`)
  }
}

/** Parses and strictly validates one head() JSON-LD script entry. */
function validateJsonLd(script: JsonLdScript): JsonNode {
  expect(script.type).toBe('application/ld+json')
  expect(script.children).not.toContain('<')
  const data = JSON.parse(script.children) as JsonNode
  expect(data['@context']).toBe('https://schema.org')
  expect(typeof data['@type']).toBe('string')
  walkJsonLd(data, String(data['@type']), true)
  return data
}

/** Every node on a page with an @id, and every {@id} reference in it. */
function collectIds(nodes: ReadonlyArray<unknown>) {
  const defined = new Map<string, JsonNode>()
  const referenced = new Set<string>()
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(visit)
    if (!node || typeof node !== 'object') return
    const obj = node as JsonNode
    const id = obj['@id']
    if (typeof id === 'string') {
      if (Object.keys(obj).length === 1) referenced.add(id)
      else defined.set(id, obj)
    }
    Object.values(obj).forEach(visit)
  }
  nodes.forEach(visit)
  return { defined, referenced }
}

/**
 * Every script a page emits, as the routes build them: the root head's site
 * nodes, the page's own blocks and the {-$locale} layout's breadcrumb.
 */
function pageScripts(
  locale: string,
  normalizedPath: string,
  own: ReadonlyArray<JsonLdScript> = [],
): Array<JsonLdScript> {
  const breadcrumbs = buildBreadcrumbTrail(normalizedPath, locale, (key) =>
    translateExact(locale, 'common', key),
  )
  return [
    ...localizedSiteStructuredData(locale).map((node) => jsonLd(node)),
    ...own,
    ...(breadcrumbs ? [jsonLd(breadcrumbs)] : []),
  ]
}

function blogPostScripts(locale: string, title: string): Array<JsonLdScript> {
  const path = '/blog/post'
  const canonicalUrl = `${SEO_ORIGIN}/${locale}${path}`
  const breadcrumbs = buildBreadcrumbTrail(
    '/blog',
    locale,
    (key) => translateExact(locale, 'common', key),
    { name: title, path },
  )
  return [
    ...localizedSiteStructuredData(locale).map((node) => jsonLd(node)),
    jsonLd(
      buildBlogPostingStructuredData({
        canonicalUrl,
        headline: title,
        description: 'Opis posta',
        image: `${SEO_ORIGIN}/og-image.png`,
        datePublished: '2025-11-22',
        dateModified: '2025-11-22',
        authorName: 'Selma Hadžić',
        locale,
      }),
    ),
    ...(breadcrumbs ? [jsonLd(breadcrumbs)] : []),
  ]
}

describe('JSON-LD on every public page template (strict)', () => {
  for (const locale of SEO_PRIORITY_LOCALES) {
    describe(locale, () => {
      // Built inside each test: the bundles load in beforeAll.
      const pages: Array<[string, () => Array<JsonLdScript>]> = [
        // Target state: the home route adds no WebSite node of its own (the
        // root head's localized one is on every page).
        ['/', () => pageScripts(locale, '/')],
        ['/contact', () => pageScripts(locale, '/contact')],
        ['/services', () => pageScripts(locale, '/services')],
        ...SERVICE_IDS.map(
          (serviceId): [string, () => Array<JsonLdScript>] => [
            SERVICE_ROUTES[serviceId],
            () =>
              pageScripts(
                locale,
                SERVICE_ROUTES[serviceId],
                localizedServiceHead(serviceId, locale).scripts,
              ),
          ],
        ),
        ['/blog/post', () => blogPostScripts(locale, 'Naslov </script><script>x')],
      ]

      for (const [path, build] of pages) {
        it(`${path}: every block parses, is escaped and complete`, () => {
          const scripts = build()
          // Site nodes (2) + the page's own blocks + a breadcrumb (not on home).
          expect(scripts.length).toBeGreaterThanOrEqual(path === '/' ? 2 : 3)
          const nodes = scripts.map(validateJsonLd)
          const { defined, referenced } = collectIds(nodes)
          // #business and #website are defined on every page, so every
          // reference to them resolves.
          expect(defined.get(`${SEO_ORIGIN}/#business`)?.['@type']).toBe(
            'AccountingService',
          )
          expect(defined.get(`${SEO_ORIGIN}/#website`)?.['@type']).toBe('WebSite')
          for (const id of referenced) {
            if (id.startsWith(`${SEO_ORIGIN}/#`)) {
              expect(defined.has(id), `${id} is referenced but not defined`).toBe(true)
            }
          }
          // No two WebSite nodes contradict each other on url/inLanguage.
          const websites = nodes.filter((n) => n['@type'] === 'WebSite')
          for (const site of websites) {
            if ('url' in site) expect(site.url).toBe(`${SEO_ORIGIN}/${locale}`)
            if ('inLanguage' in site) expect(site.inLanguage).toBe(locale)
          }
          if (path !== '/') {
            expect(nodes.some((n) => n['@type'] === 'BreadcrumbList'), 'breadcrumb').toBe(
              true,
            )
          }
        })
      }

      it('a locale-less WebSite node (legacy home head) never contradicts the localized one', () => {
        const legacy = buildWebSiteStructuredData()
        const [, website] = localizedSiteStructuredData(locale)
        expect(website).toMatchObject(legacy)
        expect(Object.keys(legacy)).not.toContain('url')
        expect(Object.keys(legacy)).not.toContain('inLanguage')
      })

      it('builds the business and WebSite nodes in this locale', () => {
        const [business, website] = localizedSiteStructuredData(locale) as Array<
          JsonNode
        >
        const { description } = resolveSeoStrings('default', locale)
        expect(business['@id']).toBe(`${SEO_ORIGIN}/#business`)
        expect(business.url).toBe(`${SEO_ORIGIN}/${locale}`)
        expect(business.description).toBe(description)
        expect(website).toMatchObject({
          '@id': `${SEO_ORIGIN}/#website`,
          url: `${SEO_ORIGIN}/${locale}`,
          inLanguage: locale,
          description,
        })
        expect((business.hasOfferCatalog as JsonNode).name).toBe(
          i18n.getResource(locale, 'common', 'breadcrumbs.services'),
        )
      })

      it('points the offer catalog at the Service nodes of the service pages', () => {
        const [business] = localizedSiteStructuredData(locale) as Array<JsonNode>
        const catalog = business.hasOfferCatalog as { itemListElement: Array<JsonNode> }
        const catalogIds = catalog.itemListElement.map(
          (offer) => (offer.itemOffered as { '@id': string })['@id'],
        )
        const serviceIds = SERVICE_IDS.map(
          (serviceId) =>
            JSON.parse(localizedServiceHead(serviceId, locale).scripts[0].children)[
              '@id'
            ],
        )
        expect(catalogIds).toEqual(serviceIds)
        expect(serviceIds).toEqual(
          SERVICE_IDS.map((serviceId) => serviceStructuredDataId(serviceId, locale)),
        )
      })

      it('gives every Service its breadcrumb label as serviceType', () => {
        for (const serviceId of SERVICE_IDS) {
          const data = JSON.parse(localizedServiceHead(serviceId, locale).scripts[0].children)
          const pageKey = SEO_PAGE_KEY[SERVICE_ROUTES[serviceId]]
          expect(data.serviceType).toBe(
            i18n.getResource(locale, 'common', `breadcrumbs.${pageKey}`),
          )
        }
      })

      it('prices only the bookkeeping Service, from its visible price block', () => {
        for (const serviceId of SERVICE_IDS) {
          const data = JSON.parse(localizedServiceHead(serviceId, locale).scripts[0].children)
          if (serviceId !== 'bookkeeping') {
            expect(data, serviceId).not.toHaveProperty('offers')
            continue
          }
          const visible = i18n.getResource(
            locale,
            'services',
            'items.bookkeeping.pricing.plans',
          ) as Array<{ name: string; price: string; period: string }>
          expect(data.offers.map((o: JsonNode) => o.name)).toEqual(
            visible.map((plan) => plan.name),
          )
          // The two published starting prices: obrt 150 KM, d.o.o. 300 KM.
          expect(
            data.offers.map(
              (o: { priceSpecification: { minPrice: number } }) =>
                o.priceSpecification.minPrice,
            ),
          ).toEqual([150, 300])
          for (const [i, offer] of data.offers.entries()) {
            expect(visible[i].price).toContain(String(offer.priceSpecification.minPrice))
            expect(offer.priceSpecification).toMatchObject({
              priceCurrency: 'BAM',
              unitCode: 'MON',
              unitText: visible[i].period,
            })
          }
        }
      })
    })
  }

  it('describes the business in each indexable language, not only in Bosnian', () => {
    const descriptions = SEO_PRIORITY_LOCALES.map(
      (locale) => (localizedSiteStructuredData(locale)[0] as JsonNode).description,
    )
    expect(new Set(descriptions).size).toBe(SEO_PRIORITY_LOCALES.length)
    const en = localizedSiteStructuredData('en-US')[0] as JsonNode
    expect(en.description).not.toMatch(/Računovodstvena|knjigovodstvo/)
  })

  it('uses the default locale for an unknown or missing locale param', () => {
    expect(localizedSiteStructuredData(undefined)).toEqual(
      localizedSiteStructuredData('bs-BA'),
    )
    expect(localizedSiteStructuredData('xx-XX')).toEqual(
      localizedSiteStructuredData('bs-BA'),
    )
  })

  it('validates a noindex locale too (seo fallback, locale url)', () => {
    const [business, website] = localizedSiteStructuredData('de-DE').map((node) =>
      validateJsonLd(jsonLd(node)),
    )
    expect(business.url).toBe(`${SEO_ORIGIN}/de-DE`)
    expect(website.inLanguage).toBe('de-DE')
    expect(business.description).not.toMatch(/^(pages|default)\./)
  })

  it('rejects an unescaped <, a raw key and banned markup', () => {
    expect(() =>
      validateJsonLd({
        type: 'application/ld+json',
        children: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Person', name: '</script>' }),
      }),
    ).toThrow()
    expect(() =>
      validateJsonLd(
        jsonLd({ '@context': 'https://schema.org', '@type': 'Person', name: 'items.bookkeeping.title' }),
      ),
    ).toThrow()
    expect(() =>
      validateJsonLd(
        jsonLd({
          '@context': 'https://schema.org',
          '@type': 'AccountingService',
          aggregateRating: { '@type': 'AggregateRating', ratingValue: 5 },
        }),
      ),
    ).toThrow()
    expect(() =>
      validateJsonLd(jsonLd({ '@context': 'https://schema.org', '@type': 'FAQPage' })),
    ).toThrow()
  })
})

describe('servicePricePlans', () => {
  it('reads the visible plans and skips unreadable ones', () => {
    i18n.addResourceBundle(
      'nl-NL',
      'services',
      {
        items: {
          bookkeeping: {
            pricing: {
              plans: [
                { name: 'Eenmanszaak', price: 'vanaf 150 KM', period: 'per maand' },
                { name: 'BV', price: 'op aanvraag' },
                { name: '', price: 'vanaf 300 KM' },
                'not a plan',
              ],
            },
          },
        },
      },
      true,
      true,
    )
    expect(servicePricePlans('bookkeeping', 'nl-NL')).toEqual([
      { name: 'Eenmanszaak', minPrice: 150, unitText: 'per maand', description: null },
    ])
    expect(servicePricePlans('taxConsulting', 'nl-NL')).toEqual([])
    expect(servicePricePlans('bookkeeping', 'ko-KR')).toEqual([])
  })
})
