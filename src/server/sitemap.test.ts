import { SEO_PRIORITY_LOCALES } from '@/lib/seo'
import { describe, expect, it, vi } from 'vitest'
import {
  SITEMAP_LOCALES,
  STATIC_CONTENT_LASTMOD,
  STATIC_PATHS,
  handleSitemap,
  latestDate,
  localeSitemap,
  localeSitemapLastmod,
  selectLocalePosts,
  sitemapIndex,
  urlEntry,
} from './sitemap'
import type { SitemapPostRow } from './sitemap'

const row = (overrides: Partial<SitemapPostRow>): SitemapPostRow => ({
  slug: 'post',
  lang: 'en-US',
  publishedAt: null,
  updatedAt: null,
  translationId: null,
  translatedAt: null,
  ...overrides,
})

const get = (path: string) =>
  handleSitemap(new Request(`https://www.starthn.ba${path}`), {})

/**
 * Published posts per locale as the sitemap query returns them (drizzle reads
 * D1 rows as arrays in select order: slug, lang, publishedAt, updatedAt,
 * translationId, translatedAt). The locale is the join parameter.
 */
const D1_ROWS: Record<string, Array<Array<string | null>>> = {
  'bs-BA': [
    ['native-bs', 'bs-BA', '2026-05-01T00:00:00Z', null, null, null],
    [
      'translated',
      'en-US',
      '2026-04-01T00:00:00Z',
      '2026-04-15 10:00:00',
      't1',
      '2026-05-30 09:00:00',
    ],
  ],
  'en-US': [
    [
      'translated',
      'en-US',
      '2026-04-01T00:00:00Z',
      '2026-04-15 10:00:00',
      null,
      null,
    ],
  ],
  'hr-HR': [],
}

function fakeD1({ fail = false } = {}): D1Database {
  const prepare = () => {
    let params: Array<unknown> = []
    const rows = () => {
      if (fail) return Promise.reject(new Error('D1 unavailable'))
      const locale = params.find(
        (p): p is string => typeof p === 'string' && p in D1_ROWS,
      )
      return Promise.resolve(locale ? D1_ROWS[locale] : [])
    }
    const statement = {
      bind: (...bound: Array<unknown>) => {
        params = bound
        return statement
      },
      raw: rows,
      all: () =>
        rows().then((results) => ({ results, success: true, meta: {} })),
    }
    return statement
  }
  return { prepare } as unknown as D1Database
}

describe('SITEMAP_LOCALES', () => {
  it('lists exactly the indexable locales', () => {
    expect([...SITEMAP_LOCALES]).toEqual([...SEO_PRIORITY_LOCALES])
    expect(SITEMAP_LOCALES).toContain('de-DE')
  })
})

describe('latestDate', () => {
  it('returns the newest date part across mixed timestamp formats', () => {
    expect(
      latestDate(
        '2026-05-20T08:00:00.000Z',
        '2026-05-28 10:00:00',
        '2026-05-27T23:59:59Z',
      ),
    ).toBe('2026-05-28')
  })

  it('ignores missing and malformed values', () => {
    expect(latestDate(null, undefined, '', 'not-a-date', '2026-01-02')).toBe(
      '2026-01-02',
    )
    expect(latestDate(null, undefined)).toBeUndefined()
  })
})

describe('selectLocalePosts', () => {
  const rows = [
    row({
      slug: 'native-bs',
      lang: 'bs-BA',
      publishedAt: '2026-05-01T00:00:00Z',
    }),
    row({
      slug: 'translated',
      lang: 'en-US',
      publishedAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-04-15 10:00:00',
      translationId: 't1',
      translatedAt: '2026-05-30 09:00:00',
    }),
    row({
      slug: 'untranslated',
      lang: 'en-US',
      publishedAt: '2026-06-01T00:00:00Z',
    }),
  ]

  it('keeps posts written in the locale or translated into it', () => {
    expect(selectLocalePosts(rows, 'bs-BA').map((p) => p.slug)).toEqual([
      'native-bs',
      'translated',
    ])
  })

  it('keeps native posts of another locale only in that locale', () => {
    expect(selectLocalePosts(rows, 'en-US').map((p) => p.slug)).toEqual([
      'translated',
      'untranslated',
    ])
  })

  it('uses max(publishedAt, updatedAt, translatedAt) as lastmod', () => {
    const [, translated] = selectLocalePosts(rows, 'bs-BA')
    expect(translated).toEqual({ slug: 'translated', lastmod: '2026-05-30' })
  })
})

describe('urlEntry', () => {
  it('omits <lastmod> when no date is given', () => {
    const entry = urlEntry('/bs-BA/about')
    expect(entry).toContain('<loc>https://www.starthn.ba/bs-BA/about</loc>')
    expect(entry).not.toContain('<lastmod>')
  })

  it('writes <lastmod> when a date is given', () => {
    expect(urlEntry('/bs-BA/blog/x', '2026-05-30')).toContain(
      '<lastmod>2026-05-30</lastmod>',
    )
  })
})

describe('STATIC_CONTENT_LASTMOD', () => {
  it('is a real calendar date', () => {
    expect(STATIC_CONTENT_LASTMOD).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(new Date(`${STATIC_CONTENT_LASTMOD}T00:00:00Z`).toISOString()).toBe(
      `${STATIC_CONTENT_LASTMOD}T00:00:00.000Z`,
    )
  })
})

describe('localeSitemap', () => {
  // An older static date than the posts, so both sources are visible.
  const STATIC = '2026-05-01'
  const xml = localeSitemap(
    'bs-BA',
    [
      { slug: 'a', lastmod: '2026-05-30' },
      { slug: 'b', lastmod: '2026-06-02' },
      { slug: 'c', lastmod: undefined },
    ],
    STATIC,
  )

  it('lists every static path and every post for the locale', () => {
    for (const path of STATIC_PATHS) {
      expect(xml).toContain(`<loc>https://www.starthn.ba/bs-BA${path}</loc>`)
    }
    expect(xml).toContain('<loc>https://www.starthn.ba/bs-BA/blog/a</loc>')
    expect(xml).toContain('<loc>https://www.starthn.ba/bs-BA/blog/c</loc>')
  })

  it('dates static pages with the static content date, /blog with the newest post', () => {
    expect(xml).toContain(
      '<loc>https://www.starthn.ba/bs-BA/blog</loc>\n    <lastmod>2026-06-02</lastmod>',
    )
    expect(xml).toContain(
      `<loc>https://www.starthn.ba/bs-BA/about</loc>\n    <lastmod>${STATIC}</lastmod>`,
    )
    expect(xml).toContain(
      '<loc>https://www.starthn.ba/bs-BA/blog/a</loc>\n    <lastmod>2026-05-30</lastmod>',
    )
    // A post without a usable date stays undated.
    expect(xml).toContain(
      '<loc>https://www.starthn.ba/bs-BA/blog/c</loc>\n  </url>',
    )
  })

  it('keeps /blog at the static date when it is newer than every post', () => {
    const later = localeSitemap(
      'bs-BA',
      [{ slug: 'a', lastmod: '2026-05-30' }],
      '2026-09-25',
    )
    expect(later).toContain(
      '<loc>https://www.starthn.ba/bs-BA/blog</loc>\n    <lastmod>2026-09-25</lastmod>',
    )
  })

  it('never lists the disabled team page', () => {
    expect(xml).not.toContain('/team')
  })

  it('leaves out pages that have no text of their own in the locale', () => {
    const hr = localeSitemap('hr-HR', [])
    expect(hr).not.toContain('/hr-HR/privacy<')
    expect(hr).not.toContain('/hr-HR/terms<')
    expect(hr).toContain('<loc>https://www.starthn.ba/hr-HR/about</loc>')
    for (const locale of ['bs-BA', 'en-US']) {
      const own = localeSitemap(locale, [])
      expect(own).toContain(
        `<loc>https://www.starthn.ba/${locale}/privacy</loc>`,
      )
      expect(own).toContain(`<loc>https://www.starthn.ba/${locale}/terms</loc>`)
    }
  })
})

describe('localeSitemapLastmod', () => {
  it('is the newest <lastmod> the locale sitemap contains', () => {
    const posts = [
      { slug: 'a', lastmod: '2026-05-30' },
      { slug: 'b', lastmod: '2026-06-02' },
      { slug: 'c', lastmod: undefined },
    ]
    for (const staticDate of ['2026-05-01', '2026-09-25']) {
      const xml = localeSitemap('bs-BA', posts, staticDate)
      const dates = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(
        (m) => m[1],
      )
      expect(localeSitemapLastmod(posts, staticDate)).toBe(
        [...dates].sort().at(-1),
      )
    }
    expect(localeSitemapLastmod(posts, '2026-05-01')).toBe('2026-06-02')
  })

  it('is the static content date when no post is newer (or dated)', () => {
    expect(localeSitemapLastmod([])).toBe(STATIC_CONTENT_LASTMOD)
    expect(localeSitemapLastmod([{ slug: 'x', lastmod: undefined }])).toBe(
      STATIC_CONTENT_LASTMOD,
    )
  })
})

describe('sitemapIndex', () => {
  const locsOf = (xml: string) =>
    [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])

  it('lists exactly the kept locale sitemaps', () => {
    expect(locsOf(sitemapIndex())).toEqual(
      SEO_PRIORITY_LOCALES.map((code) => `https://www.starthn.ba/sitemap-${code}.xml`),
    )
  })

  it('dates each child with its newest lastmod, and never invents one', () => {
    const xml = sitemapIndex({ 'bs-BA': '2026-06-02', 'en-US': '2026-05-30' })
    expect(xml).toContain(
      '<loc>https://www.starthn.ba/sitemap-bs-BA.xml</loc>\n    <lastmod>2026-06-02</lastmod>\n  </sitemap>',
    )
    expect(xml).toContain(
      '<loc>https://www.starthn.ba/sitemap-en-US.xml</loc>\n    <lastmod>2026-05-30</lastmod>\n  </sitemap>',
    )
    expect(xml).toContain(
      '<loc>https://www.starthn.ba/sitemap-hr-HR.xml</loc>\n  </sitemap>',
    )
    expect(sitemapIndex()).not.toContain('<lastmod>')
  })
})

describe('handleSitemap', () => {
  it('serves the index and kept-locale sitemaps as XML', async () => {
    const index = await get('/sitemap.xml')
    expect(index?.status).toBe(200)
    expect(index?.headers.get('content-type')).toContain('application/xml')

    const bs = await get('/sitemap-bs-BA.xml')
    expect(bs?.status).toBe(200)
    expect(await bs?.text()).toContain('https://www.starthn.ba/bs-BA/services')
  })

  it('answers 410 for unknown codes', async () => {
    for (const code of ['xx-XX', 'th-TH', 'BS-BA']) {
      const res = await get(`/sitemap-${code}.xml`)
      expect(res?.status, code).toBe(410)
      expect(res?.headers.get('cache-control'), code).toBe('no-store')
    }
  })

  it('dates each index entry with the newest lastmod of that child sitemap', async () => {
    const request = (path: string) =>
      new Request(`https://www.starthn.ba${path}`)
    const env = { DB: fakeD1() }

    const index = await (await handleSitemap(
      request('/sitemap.xml'),
      env,
    ))!.text()
    // Every child has a date, including hr-HR, which has no post: the
    // static pages' content date (newer than the fake posts here).
    for (const locale of SITEMAP_LOCALES) {
      expect(index).toContain(
        `<loc>https://www.starthn.ba/sitemap-${locale}.xml</loc>\n    <lastmod>${STATIC_CONTENT_LASTMOD}</lastmod>`,
      )
    }

    // Each date really is the newest <lastmod> in that child.
    for (const [locale, expected] of [
      ['bs-BA', STATIC_CONTENT_LASTMOD],
      ['en-US', STATIC_CONTENT_LASTMOD],
      ['hr-HR', STATIC_CONTENT_LASTMOD],
    ]) {
      const child = await (await handleSitemap(
        request(`/sitemap-${locale}.xml`),
        env,
      ))!.text()
      const dates = [...child.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(
        (m) => m[1],
      )
      expect(dates.sort().at(-1), locale).toBe(expected)
    }
  })

  it('still serves the index, with the static date, when D1 fails', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const res = await handleSitemap(
        new Request('https://www.starthn.ba/sitemap.xml'),
        {
          DB: fakeD1({ fail: true }),
        },
      )
      expect(res?.status).toBe(200)
      const xml = await res!.text()
      expect(xml).toContain('<sitemapindex')
      expect(xml.match(/<lastmod>/g)).toHaveLength(SITEMAP_LOCALES.length)
      expect(xml).toContain(`<lastmod>${STATIC_CONTENT_LASTMOD}</lastmod>`)
      expect(logged).toHaveBeenCalled()
    } finally {
      logged.mockRestore()
    }
  })

  it('ignores paths that are not sitemaps', async () => {
    expect(await get('/robots.txt')).toBeNull()
    expect(await get('/sitemap-bs-BA.xml/extra')).toBeNull()
  })
})
