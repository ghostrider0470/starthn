import { describe, expect, it } from 'vitest'
import { LEGACY_REDIRECTS, lookupLegacy } from './legacy-redirects'
import { STATIC_PATHS } from './sitemap'

const LIVE_PATHS = new Set(STATIC_PATHS.map((p) => p || '/'))
const LIVE_BLOG_POSTS = new Set([
  '/blog/how-to-start-a-business-in-bih-a-practical-guide-tips-from-experience-with-the-n1-tv-appearance',
  '/blog/importance-of-entrepreneurship-programs',
])

describe('LEGACY_REDIRECTS', () => {
  it('uses lowercase keys without a trailing slash', () => {
    for (const key of Object.keys(LEGACY_REDIRECTS)) {
      expect(key, key).toBe(key.toLowerCase())
      expect(key, key).toMatch(/^\/[^/]/)
      expect(key.endsWith('/'), key).toBe(false)
    }
  })

  it('points every old URL at a live, locale-less page', () => {
    for (const [key, target] of Object.entries(LEGACY_REDIRECTS)) {
      expect(
        LIVE_PATHS.has(target) || LIVE_BLOG_POSTS.has(target),
        `${key} → ${target}`,
      ).toBe(true)
      expect(target, key).not.toMatch(/^\/(bs-BA|en-US|hr-HR)(\/|$)/)
    }
  })

  it('does not map /business-consulting (a bare slug is handled by the service-slug rule)', () => {
    expect(LEGACY_REDIRECTS['/business-consulting']).toBeUndefined()
  })
})

describe('lookupLegacy', () => {
  it('maps the ranking WordPress pages', () => {
    expect(lookupLegacy('/o-nama')).toBe('/about')
    expect(lookupLegacy('/kontakt')).toBe('/contact')
    expect(lookupLegacy('/pokretanje-biznisa-u-bih')).toBe(
      '/blog/how-to-start-a-business-in-bih-a-practical-guide-tips-from-experience-with-the-n1-tv-appearance',
    )
    expect(lookupLegacy('/service/racunovodstvene-knjigovodstvene')).toBe(
      '/services/bookkeeping-accounting',
    )
  })

  it('ignores case and trailing slashes', () => {
    expect(lookupLegacy('/o-nama/')).toBe('/about')
    expect(lookupLegacy('/O-Nama//')).toBe('/about')
    expect(lookupLegacy('/KONTAKT')).toBe('/contact')
  })

  it('ignores an /amp or /feed suffix', () => {
    expect(lookupLegacy('/o-nama/feed')).toBe('/about')
    expect(lookupLegacy('/o-nama/feed/')).toBe('/about')
    expect(lookupLegacy('/kontakt/amp')).toBe('/contact')
    expect(lookupLegacy('/category/marketing/feed')).toBe('/blog')
  })

  it('treats deeper paths under an old /service/<slug> page as that page', () => {
    expect(lookupLegacy('/service/revizijske-slicne-usluge/anything')).toBe(
      '/services/tax-consulting',
    )
    expect(lookupLegacy('/service/revizijske-slicne-usluge/a/b/')).toBe(
      '/services/tax-consulting',
    )
  })

  it('maps the old service slugs without the /service/ prefix', () => {
    expect(lookupLegacy('/revizijske-slicne-usluge')).toBe('/services/tax-consulting')
    expect(lookupLegacy('/racunovodstvene-knjigovodstvene/')).toBe(
      '/services/bookkeeping-accounting',
    )
    expect(lookupLegacy('/porezno-planiranje-savejtovanje')).toBe('/services/virtual-cfo')
  })

  it('maps the WordPress index files and the bare /service to real pages', () => {
    expect(lookupLegacy('/index.php')).toBe('/')
    expect(lookupLegacy('/index.html')).toBe('/')
    expect(lookupLegacy('/service')).toBe('/services')
    expect(lookupLegacy('/service/')).toBe('/services')
  })

  it('returns null for everything else', () => {
    expect(lookupLegacy('/')).toBeNull()
    expect(lookupLegacy('')).toBeNull()
    expect(lookupLegacy('/about')).toBeNull()
    expect(lookupLegacy('/business-consulting')).toBeNull()
    expect(lookupLegacy('/service/unknown')).toBeNull()
    expect(lookupLegacy('/o-nama/extra')).toBeNull()
    expect(lookupLegacy('/constructor')).toBeNull()
    expect(lookupLegacy('/blog/feed')).toBeNull()
  })
})
