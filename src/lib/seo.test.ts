import { describe, expect, it } from 'vitest'
import { SEO_ORIGIN, buildLocalizedSeoHead } from './seo'

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
    // 16 priority locales + x-default
    expect(alternates).toHaveLength(17)
    expect(alternates.at(-1)).toEqual({
      hreflang: 'x-default',
      href: `${SEO_ORIGIN}/en-US/about`,
    })
    expect(alternates).toContainEqual({
      hreflang: 'de-DE',
      href: `${SEO_ORIGIN}/de-DE/about`,
    })
  })

  it('canonicalizes non-priority locales to en-US and drops alternates', () => {
    const { canonicalUrl, alternates, robots } = buildLocalizedSeoHead(
      '/about',
      'th-TH',
    )
    expect(canonicalUrl).toBe(`${SEO_ORIGIN}/en-US/about`)
    expect(alternates).toEqual([])
    expect(robots).toBe('noindex,follow')
  })

  it('marks priority locales index,follow', () => {
    expect(buildLocalizedSeoHead('/', 'hr-HR').robots).toBe('index,follow')
  })
})
