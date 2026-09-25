import { describe, expect, it } from 'vitest'
import { ALL_LANGUAGE_CODES } from '@/lib/languages'
import {
  AREA_SERVED,
  OG_LOCALE_MAP,
  PRICE_CURRENCY,
  SEO_ORIGIN,
  SEO_PAGE_KEY,
  SEO_PRIORITY_LOCALES,
  buildBlogPostingStructuredData,
  buildBreadcrumbTrail,
  buildLocalBusinessStructuredData,
  buildLocalizedSeoHead,
  buildServiceStructuredData,
  buildWebSiteStructuredData,
  isIndexableLocaleForPage,
  isPrivateRoute,
  jsonLd,
  localizedCanonicalUrl,
  parsePriceAmount,
  serviceStructuredDataId,
  toOpenGraphLocale,
  truncateAtWord,
} from './seo'
import {
  FACEBOOK_PROFILE_URL,
  ID_BROJ,
  INSTAGRAM_URL,
  LEGAL_NAME,
  MBS,
  OWNER_LINKEDIN_URL,
} from './business'
import { SUPPORTED_LOCALES } from './i18n-utils'
import { SERVICE_IDS, SERVICE_ROUTES } from './service-routes'

describe('buildLocalizedSeoHead', () => {
  it('self-canonicalizes a priority locale to the www origin', () => {
    const { canonicalUrl } = buildLocalizedSeoHead('/blog/my-post', 'bs-BA')
    expect(canonicalUrl).toBe(`${SEO_ORIGIN}/bs-BA/blog/my-post`)
  })

  it('maps the root path without a trailing slash', () => {
    const { canonicalUrl } = buildLocalizedSeoHead('/', 'en-US')
    expect(canonicalUrl).toBe(`${SEO_ORIGIN}/en-US`)
  })

  it('emits the full hreflang set plus x-default for priority locales', () => {
    const { alternates } = buildLocalizedSeoHead('/about', 'en-US')
    // every indexable locale + x-default
    expect(alternates).toHaveLength(SEO_PRIORITY_LOCALES.length + 1)
    expect(alternates.at(-1)).toEqual({
      hreflang: 'x-default',
      href: `${SEO_ORIGIN}/bs-BA/about`,
    })
    expect(alternates).toContainEqual({
      hreflang: 'hr-HR',
      href: `${SEO_ORIGIN}/hr-HR/about`,
    })
    expect(alternates.map((a) => a.hreflang)).toContain('de-DE')
  })

  it('indexes every site language with a self canonical and hreflang', () => {
    for (const code of ALL_LANGUAGE_CODES) {
      expect(SEO_PRIORITY_LOCALES as ReadonlyArray<string>).toContain(code)
    }
    const { canonicalUrl, alternates, robots, ogLocale } = buildLocalizedSeoHead(
      '/about',
      'de-DE',
    )
    expect(canonicalUrl).toBe(`${SEO_ORIGIN}/de-DE/about`)
    expect(alternates).toHaveLength(SEO_PRIORITY_LOCALES.length + 1)
    expect(robots).toBe('index,follow')
    expect(ogLocale).toBe('de_DE')
  })

  it('canonicalizes unknown locales to the default (bs-BA) and drops alternates', () => {
    const { canonicalUrl, alternates, robots } = buildLocalizedSeoHead(
      '/about',
      'th-TH',
    )
    expect(canonicalUrl).toBe(`${SEO_ORIGIN}/bs-BA/about`)
    expect(alternates).toEqual([])
    expect(robots).toBe('noindex,follow')
  })

  it('marks priority locales index,follow', () => {
    expect(buildLocalizedSeoHead('/', 'hr-HR').robots).toBe('index,follow')
  })

  it('returns the og:locale of the page locale', () => {
    expect(buildLocalizedSeoHead('/', 'bs-BA').ogLocale).toBe('bs_BA')
    expect(buildLocalizedSeoHead('/', 'sr-Latn').ogLocale).toBe('sr_RS')
    expect(buildLocalizedSeoHead('/', 'th-TH').ogLocale).toBe('bs_BA')
  })

  it('limits hreflang to the allowed locales (blog posts)', () => {
    const { alternates } = buildLocalizedSeoHead('/blog/post', 'bs-BA', [
      'bs-BA',
      'de-DE',
    ])
    expect(alternates).toEqual([
      { hreflang: 'bs-BA', href: `${SEO_ORIGIN}/bs-BA/blog/post` },
      { hreflang: 'de-DE', href: `${SEO_ORIGIN}/de-DE/blog/post` },
      { hreflang: 'x-default', href: `${SEO_ORIGIN}/bs-BA/blog/post` },
    ])
  })

  it('points x-default at the first allowed locale when the default is missing', () => {
    const { alternates } = buildLocalizedSeoHead('/blog/post', 'en-US', [
      'en-US',
      'hr-HR',
    ])
    expect(alternates.map((a) => a.hreflang)).toEqual(['en-US', 'hr-HR', 'x-default'])
    expect(alternates.at(-1)?.href).toBe(`${SEO_ORIGIN}/en-US/blog/post`)
  })

  it('keeps pages with locale-limited content out of the other locales (legal pages)', () => {
    const hr = buildLocalizedSeoHead('/privacy', 'hr-HR')
    expect(hr.robots).toBe('noindex,follow')
    expect(hr.alternates).toEqual([])
    expect(hr.canonicalUrl).toBe(`${SEO_ORIGIN}/hr-HR/privacy`)

    for (const locale of ['bs-BA', 'en-US']) {
      const own = buildLocalizedSeoHead('/terms', locale)
      expect(own.robots).toBe('index,follow')
      expect(own.alternates.map((a) => a.hreflang)).toEqual([
        'bs-BA',
        'en-US',
        'x-default',
      ])
    }
    expect(isIndexableLocaleForPage('/privacy', 'hr-HR')).toBe(false)
    expect(isIndexableLocaleForPage('/about', 'hr-HR')).toBe(true)
    expect(isIndexableLocaleForPage('/about', 'de-DE')).toBe(true)
    expect(isIndexableLocaleForPage('/privacy', 'de-DE')).toBe(false)
  })

  it('treats a null allowed list as no filter', () => {
    expect(buildLocalizedSeoHead('/blog/post', 'bs-BA', null).alternates).toHaveLength(
      SEO_PRIORITY_LOCALES.length + 1,
    )
  })
})

describe('private routes', () => {
  it('server-renders noindex,nofollow for private routes in any locale', () => {
    expect(buildLocalizedSeoHead('/login', 'bs-BA').robots).toBe('noindex,nofollow')
    expect(buildLocalizedSeoHead('/admin/users', 'en-US').robots).toBe('noindex,nofollow')
    expect(buildLocalizedSeoHead('/my-page', 'th-TH').robots).toBe('noindex,nofollow')
    expect(buildLocalizedSeoHead('/LOGIN', 'bs-BA').robots).toBe('noindex,nofollow')
    expect(isPrivateRoute('/Admin/Users')).toBe(true)
  })

  it('emits no hreflang alternates for private routes', () => {
    expect(buildLocalizedSeoHead('/login', 'bs-BA').alternates).toEqual([])
    expect(buildLocalizedSeoHead('/Admin', 'en-US').alternates).toEqual([])
  })

  it('keeps look-alike public paths indexable', () => {
    expect(isPrivateRoute('/blog/register-a-company')).toBe(false)
    expect(isPrivateRoute('/login-help')).toBe(false)
    expect(buildLocalizedSeoHead('/contact', 'bs-BA').robots).toBe('index,follow')
  })
})

describe('toOpenGraphLocale', () => {
  it('has a valid language_TERRITORY value for every supported locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(OG_LOCALE_MAP[locale], locale).toMatch(/^[a-z]{2}_[A-Z]{2}$/)
    }
  })

  it('maps script subtags to a territory', () => {
    expect(toOpenGraphLocale('zh-Hans')).toBe('zh_CN')
    expect(toOpenGraphLocale('sr-Latn')).toBe('sr_RS')
    expect(toOpenGraphLocale('ar-SA')).toBe('ar_AR')
  })
})

describe('localizedCanonicalUrl', () => {
  it('matches the canonical of buildLocalizedSeoHead', () => {
    for (const locale of [...SUPPORTED_LOCALES, 'th-TH']) {
      for (const path of ['/', '/about', '/services/tax-consulting']) {
        expect(localizedCanonicalUrl(path, locale)).toBe(
          buildLocalizedSeoHead(path, locale).canonicalUrl,
        )
      }
    }
  })
})

describe('buildLocalBusinessStructuredData', () => {
  it('matches the Google Business Profile NAP', () => {
    const data = buildLocalBusinessStructuredData()
    expect(data['@type']).toBe('AccountingService')
    expect(data.name).toBe('Računovodstvena Agencija START HN')
    expect(data.telephone).toBe('+387 61 221 368')
    expect(data.email).toBe('klijenti@starthn.ba')
    expect(data.address.streetAddress).toBe('Ibrahima Ljubovića 47')
    expect(data.address.postalCode).toBe('71210')
    expect(data.address.addressLocality).toBe('Ilidža')
    expect(data.address.addressRegion).toBe('Kanton Sarajevo')
    expect(data.address.addressCountry).toBe('BA')
    expect(data.geo).toEqual({
      '@type': 'GeoCoordinates',
      latitude: 43.8313652,
      longitude: 18.3033777,
    })
    expect(data.openingHoursSpecification).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '16:00',
      },
    ])
    expect(data.url).toBe(`${SEO_ORIGIN}/bs-BA`)
  })

  it('lists only business-owned profiles in sameAs', () => {
    const { sameAs } = buildLocalBusinessStructuredData()
    expect(sameAs).toEqual([
      'https://maps.google.com/?cid=6152645102359996777',
      FACEBOOK_PROFILE_URL,
      INSTAGRAM_URL,
    ])
    expect(sameAs).not.toContain(OWNER_LINKEDIN_URL)
    expect(sameAs.every((url) => url.startsWith('https://'))).toBe(true)
  })

  it('names the brand as an alternate and describes the agency in bs-BA by default', () => {
    const data = buildLocalBusinessStructuredData()
    expect(data.alternateName).toEqual(['Start HN', 'START HN'])
    expect(data.description).toContain('Ilidže')
  })

  it('is built for the page locale with a stable @id', () => {
    for (const locale of SEO_PRIORITY_LOCALES) {
      const data = buildLocalBusinessStructuredData(locale, {
        description: `desc ${locale}`,
        catalogName: `catalog ${locale}`,
      })
      expect(data['@id']).toBe(`${SEO_ORIGIN}/#business`)
      expect(data.url).toBe(`${SEO_ORIGIN}/${locale}`)
      expect(data.description).toBe(`desc ${locale}`)
      expect(data.hasOfferCatalog.name).toBe(`catalog ${locale}`)
    }
  })

  it('never puts Bosnian text on another locale when no description is given', () => {
    const data = buildLocalBusinessStructuredData('en-US')
    expect(data).not.toHaveProperty('description')
    expect(data.url).toBe(`${SEO_ORIGIN}/en-US`)
  })

  it('falls back to the default locale for an unknown code', () => {
    expect(buildLocalBusinessStructuredData('xx-XX').url).toBe(`${SEO_ORIGIN}/bs-BA`)
  })

  it('serves Ilidža, Sarajevo, Kanton Sarajevo and BiH', () => {
    expect(buildLocalBusinessStructuredData().areaServed).toEqual([
      { '@type': 'City', name: 'Ilidža' },
      { '@type': 'City', name: 'Sarajevo' },
      { '@type': 'AdministrativeArea', name: 'Kanton Sarajevo' },
      { '@type': 'Country', name: 'Bosnia and Herzegovina' },
    ])
  })

  it('carries the legal name, JIB and MBS shown in the footer', () => {
    const data = buildLocalBusinessStructuredData()
    expect(data.legalName).toBe('Računovodstvena agencija START HN d.o.o.')
    expect(data.legalName).toBe(LEGAL_NAME)
    expect(data.taxID).toBe('4203402150001')
    expect(data.identifier).toEqual([
      { '@type': 'PropertyValue', propertyID: 'JIB', value: ID_BROJ },
      { '@type': 'PropertyValue', propertyID: 'MBS', value: MBS },
    ])
  })

  it('lists the six services in its offer catalog by their locale @ids', () => {
    for (const locale of SEO_PRIORITY_LOCALES) {
      const { hasOfferCatalog } = buildLocalBusinessStructuredData(locale)
      expect(hasOfferCatalog['@type']).toBe('OfferCatalog')
      expect(hasOfferCatalog.itemListElement).toEqual(
        SERVICE_IDS.map((serviceId) => ({
          '@type': 'Offer',
          itemOffered: {
            '@id': `${SEO_ORIGIN}/${locale}${SERVICE_ROUTES[serviceId]}#service`,
          },
        })),
      )
    }
  })

  it('has no priceRange, rating, review, founder or FAQ markup', () => {
    const json = JSON.stringify(buildLocalBusinessStructuredData())
    for (const banned of [
      'priceRange',
      'aggregateRating',
      'AggregateRating',
      '"review"',
      'Review',
      'founder',
      'FAQPage',
      'HowTo',
    ]) {
      expect(json).not.toContain(banned)
    }
  })
})

describe('buildWebSiteStructuredData', () => {
  it('names the site Start HN and points at the business', () => {
    const data = buildWebSiteStructuredData('bs-BA')
    expect(data['@type']).toBe('WebSite')
    expect(data['@id']).toBe(`${SEO_ORIGIN}/#website`)
    expect(data.name).toBe('Start HN')
    expect(data.alternateName).toContain('Računovodstvena Agencija START HN')
    expect(data).toMatchObject({ url: `${SEO_ORIGIN}/bs-BA`, inLanguage: 'bs-BA' })
    expect(data.publisher).toEqual({ '@id': `${SEO_ORIGIN}/#business` })
    expect(data).not.toHaveProperty('potentialAction')
  })

  it('is built for the page locale with a stable @id', () => {
    for (const locale of [...SEO_PRIORITY_LOCALES, 'de-DE']) {
      const data = buildWebSiteStructuredData(locale, `desc ${locale}`)
      expect(data).toMatchObject({
        '@id': `${SEO_ORIGIN}/#website`,
        url: `${SEO_ORIGIN}/${locale}`,
        inLanguage: locale,
        description: `desc ${locale}`,
      })
    }
  })

  it('without a locale has no locale-specific property to contradict the localized node', () => {
    const data = buildWebSiteStructuredData()
    expect(data['@id']).toBe(`${SEO_ORIGIN}/#website`)
    expect(data).not.toHaveProperty('url')
    expect(data).not.toHaveProperty('inLanguage')
    expect(data).not.toHaveProperty('description')
    expect(buildWebSiteStructuredData('en-US')).toMatchObject(data)
  })
})

describe('serviceStructuredDataId', () => {
  it('is the service canonical URL plus #service', () => {
    expect(serviceStructuredDataId('taxConsulting', 'en-US')).toBe(
      `${SEO_ORIGIN}/en-US/services/tax-consulting#service`,
    )
    expect(serviceStructuredDataId('bookkeeping', 'th-TH')).toBe(
      `${SEO_ORIGIN}/bs-BA/services/bookkeeping-accounting#service`,
    )
  })
})

describe('parsePriceAmount', () => {
  it('reads the amount of a visible KM price label', () => {
    expect(parsePriceAmount('od 150 KM')).toBe(150)
    expect(parsePriceAmount('from 300 KM')).toBe(300)
    expect(parsePriceAmount('od 300,00 KM')).toBe(300)
    expect(parsePriceAmount('od 1.200 KM')).toBe(1200)
    expect(parsePriceAmount('od 1.200,50 KM')).toBe(1200.5)
    expect(parsePriceAmount('150KM')).toBe(150)
    expect(parsePriceAmount('from 150 BAM')).toBe(150)
  })

  it('returns null without a number or without KM/BAM', () => {
    expect(parsePriceAmount('od KM')).toBeNull()
    expect(parsePriceAmount('')).toBeNull()
    expect(parsePriceAmount('from €77')).toBeNull()
    expect(parsePriceAmount('od 0 KM')).toBeNull()
  })
})

describe('buildServiceStructuredData', () => {
  const canonicalUrl = `${SEO_ORIGIN}/bs-BA/services/tax-consulting`

  it('builds a Service provided by the business, without offers by default', () => {
    const data = buildServiceStructuredData({
      locale: 'bs-BA',
      canonicalUrl,
      name: 'Porezno savjetovanje',
      description: 'Opis',
      serviceType: 'Porezno savjetovanje',
    })
    expect(data['@id']).toBe(`${canonicalUrl}#service`)
    expect(data.provider).toEqual({ '@id': `${SEO_ORIGIN}/#business` })
    expect(data.areaServed).toEqual([...AREA_SERVED])
    expect(data.serviceType).toBe('Porezno savjetovanje')
    expect(data.inLanguage).toBe('bs-BA')
    expect(data).not.toHaveProperty('offers')
  })

  it('turns visible price plans into monthly BAM offers', () => {
    const url = `${SEO_ORIGIN}/bs-BA/services/bookkeeping-accounting`
    const data = buildServiceStructuredData({
      locale: 'bs-BA',
      canonicalUrl: url,
      name: 'Računovodstvo i knjigovodstvo',
      description: 'Opis',
      plans: [
        { name: 'Obrt', minPrice: 150, unitText: 'mjesečno', description: 'Novoosnovani obrti' },
        { name: 'd.o.o.', minPrice: 300, unitText: null, description: null },
      ],
    })
    expect(data.offers).toEqual([
      {
        '@type': 'Offer',
        name: 'Obrt',
        description: 'Novoosnovani obrti',
        url,
        priceCurrency: PRICE_CURRENCY,
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          minPrice: 150,
          priceCurrency: 'BAM',
          unitCode: 'MON',
          unitText: 'mjesečno',
        },
      },
      {
        '@type': 'Offer',
        name: 'd.o.o.',
        url,
        priceCurrency: 'BAM',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          minPrice: 300,
          priceCurrency: 'BAM',
          unitCode: 'MON',
        },
      },
    ])
    expect(JSON.stringify(data)).not.toContain('priceRange')
  })
})

describe('buildBlogPostingStructuredData', () => {
  const canonicalUrl = `${SEO_ORIGIN}/bs-BA/blog/post`

  it('builds a BlogPosting with a Person author and the business as publisher', () => {
    const data = buildBlogPostingStructuredData({
      canonicalUrl,
      headline: 'Naslov',
      description: 'Opis',
      image: `${SEO_ORIGIN}/img/blog-images/a.webp?w=1200`,
      datePublished: '2025-11-22T10:00:00.000Z',
      dateModified: null,
      authorName: 'Selma Hadžić',
      locale: 'bs-BA',
    })
    expect(data['@type']).toBe('BlogPosting')
    expect(data.mainEntityOfPage).toBe(canonicalUrl)
    expect(data.author).toEqual({ '@type': 'Person', name: 'Selma Hadžić' })
    expect(data.publisher).toEqual({ '@id': `${SEO_ORIGIN}/#business` })
    expect(data.isPartOf).toEqual({ '@id': `${SEO_ORIGIN}/#website` })
    expect(data.image).toEqual([`${SEO_ORIGIN}/img/blog-images/a.webp?w=1200`])
    expect(data.dateModified).toBe('2025-11-22T10:00:00.000Z')
    expect(data.inLanguage).toBe('bs-BA')
  })

  it('falls back to the business as author and omits missing fields', () => {
    const data = buildBlogPostingStructuredData({
      canonicalUrl,
      headline: 'Naslov',
      locale: 'bs-BA',
    })
    expect(data.author).toEqual({ '@id': `${SEO_ORIGIN}/#business` })
    expect(data).not.toHaveProperty('image')
    expect(data).not.toHaveProperty('datePublished')
  })
})

describe('buildBreadcrumbTrail', () => {
  const labels: Record<string, string> = {
    'breadcrumbs.home': 'Početna',
    'breadcrumbs.services': 'Usluge',
    'breadcrumbs.serviceTaxConsulting': 'Porezno savjetovanje',
    'breadcrumbs.about': 'O nama',
    'breadcrumbs.blog': 'Blog',
  }
  const t = (key: string) => labels[key]

  it('builds Home > Services > service with absolute localized URLs', () => {
    const trail = buildBreadcrumbTrail('/services/tax-consulting', 'bs-BA', t)
    expect(trail?.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Početna', item: `${SEO_ORIGIN}/bs-BA` },
      { '@type': 'ListItem', position: 2, name: 'Usluge', item: `${SEO_ORIGIN}/bs-BA/services` },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Porezno savjetovanje',
        item: `${SEO_ORIGIN}/bs-BA/services/tax-consulting`,
      },
    ])
  })

  it('returns null for home, private routes and unknown paths', () => {
    expect(buildBreadcrumbTrail('/', 'bs-BA', t)).toBeNull()
    expect(buildBreadcrumbTrail('/login', 'bs-BA', t)).toBeNull()
    expect(buildBreadcrumbTrail('/nonexistent-page', 'bs-BA', t)).toBeNull()
    expect(buildBreadcrumbTrail('/services/unknown', 'bs-BA', t)).toBeNull()
  })

  it('returns null instead of rendering a raw key', () => {
    // i18next returns the key itself when a label is missing
    const echo = (key: string) => (key === 'breadcrumbs.home' ? 'Home' : key)
    expect(buildBreadcrumbTrail('/about', 'de-DE', echo)).toBeNull()
    expect(buildBreadcrumbTrail('/about', 'de-DE', () => undefined)).toBeNull()
  })

  it('appends a leaf item (blog post)', () => {
    const trail = buildBreadcrumbTrail('/blog', 'bs-BA', t, {
      name: 'Naslov posta',
      path: '/blog/post',
    })
    expect(trail?.itemListElement.map((i) => i.name)).toEqual([
      'Početna',
      'Blog',
      'Naslov posta',
    ])
    expect(trail?.itemListElement.at(-1)?.item).toBe(`${SEO_ORIGIN}/bs-BA/blog/post`)
  })

  it('covers every page key', () => {
    expect(Object.keys(SEO_PAGE_KEY)).toContain('/services/education-courses')
    expect(new Set(Object.values(SEO_PAGE_KEY)).size).toBe(Object.keys(SEO_PAGE_KEY).length)
  })
})

describe('truncateAtWord', () => {
  it('keeps short text and collapses whitespace', () => {
    expect(truncateAtWord('  Kratak   opis ', 155)).toBe('Kratak opis')
  })

  it('cuts long text at a word boundary within the limit', () => {
    const text = 'riječ '.repeat(40).trim()
    const result = truncateAtWord(text, 155)
    expect(result.length).toBeLessThanOrEqual(155)
    expect(result.endsWith('riječ…')).toBe(true)
  })
})

describe('jsonLd', () => {
  it('serializes as an ld+json script and escapes <', () => {
    const script = jsonLd({ name: '</script><script>alert(1)</script>' })
    expect(script.type).toBe('application/ld+json')
    expect(script.children).not.toContain('<')
    expect(JSON.parse(script.children)).toEqual({
      name: '</script><script>alert(1)</script>',
    })
  })
})
