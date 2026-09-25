import { describe, expect, it } from 'vitest'
import {
  SITEMAP_LOCALES,
  STATIC_PATHS,
  handleSitemap,
  latestDate,
  localeSitemap,
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

describe('SITEMAP_LOCALES', () => {
  it('lists exactly the indexable locales', () => {
    expect([...SITEMAP_LOCALES]).toEqual(['bs-BA', 'en-US', 'hr-HR'])
  })
})

describe('latestDate', () => {
  it('returns the newest date part across mixed timestamp formats', () => {
    expect(
      latestDate('2026-05-20T08:00:00.000Z', '2026-05-28 10:00:00', '2026-05-27T23:59:59Z'),
    ).toBe('2026-05-28')
  })

  it('ignores missing and malformed values', () => {
    expect(latestDate(null, undefined, '', 'not-a-date', '2026-01-02')).toBe('2026-01-02')
    expect(latestDate(null, undefined)).toBeUndefined()
  })
})

describe('selectLocalePosts', () => {
  const rows = [
    row({ slug: 'native-bs', lang: 'bs-BA', publishedAt: '2026-05-01T00:00:00Z' }),
    row({
      slug: 'translated',
      lang: 'en-US',
      publishedAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-04-15 10:00:00',
      translationId: 't1',
      translatedAt: '2026-05-30 09:00:00',
    }),
    row({ slug: 'untranslated', lang: 'en-US', publishedAt: '2026-06-01T00:00:00Z' }),
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

describe('localeSitemap', () => {
  const xml = localeSitemap('bs-BA', [
    { slug: 'a', lastmod: '2026-05-30' },
    { slug: 'b', lastmod: '2026-06-02' },
    { slug: 'c', lastmod: undefined },
  ])

  it('lists every static path and every post for the locale', () => {
    for (const path of STATIC_PATHS) {
      expect(xml).toContain(`<loc>https://www.starthn.ba/bs-BA${path}</loc>`)
    }
    expect(xml).toContain('<loc>https://www.starthn.ba/bs-BA/blog/a</loc>')
    expect(xml).toContain('<loc>https://www.starthn.ba/bs-BA/blog/c</loc>')
  })

  it('dates only /blog (newest post) and the posts themselves', () => {
    expect(xml.match(/<lastmod>/g)).toHaveLength(3)
    expect(xml).toContain(
      '<loc>https://www.starthn.ba/bs-BA/blog</loc>\n    <lastmod>2026-06-02</lastmod>',
    )
    expect(xml).toContain(
      '<loc>https://www.starthn.ba/bs-BA/about</loc>\n  </url>',
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
      expect(own).toContain(`<loc>https://www.starthn.ba/${locale}/privacy</loc>`)
      expect(own).toContain(`<loc>https://www.starthn.ba/${locale}/terms</loc>`)
    }
  })
})

describe('sitemapIndex', () => {
  it('lists exactly the kept locale sitemaps, without lastmod', () => {
    const xml = sitemapIndex()
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(locs).toEqual([
      'https://www.starthn.ba/sitemap-bs-BA.xml',
      'https://www.starthn.ba/sitemap-en-US.xml',
      'https://www.starthn.ba/sitemap-hr-HR.xml',
    ])
    expect(xml).not.toContain('<lastmod>')
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

  it('answers 410 for noindex locales and unknown codes', async () => {
    for (const code of ['de-DE', 'sr-Latn', 'zh-Hans', 'xx-XX', 'BS-BA']) {
      const res = await get(`/sitemap-${code}.xml`)
      expect(res?.status, code).toBe(410)
      expect(res?.headers.get('cache-control'), code).toBe('no-store')
    }
  })

  it('ignores paths that are not sitemaps', async () => {
    expect(await get('/robots.txt')).toBeNull()
    expect(await get('/sitemap-bs-BA.xml/extra')).toBeNull()
  })
})
