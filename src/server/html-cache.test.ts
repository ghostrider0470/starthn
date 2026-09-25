import { describe, expect, it } from 'vitest'
import {
  HTML_CACHE_CONTROL,
  htmlCacheKeyUrl,
  isHtmlCacheable,
  isTrackingParam,
} from './html-cache'
import { PRIVATE_ROUTE_PREFIXES } from '@/lib/seo'

const key = (href: string) => htmlCacheKeyUrl(new URL(href)).toString()

describe('htmlCacheKeyUrl', () => {
  it('drops utm_* and ad click IDs', () => {
    expect(
      key(
        'https://www.starthn.ba/bs-BA?utm_source=fb&utm_medium=cpc&UTM_Campaign=x&fbclid=1&gclid=2&gbraid=3&wbraid=4&msclkid=5',
      ),
    ).toBe('https://www.starthn.ba/bs-BA')
  })

  it('keeps every other query parameter', () => {
    expect(key('https://www.starthn.ba/bs-BA/blog?utm_source=x&page=2')).toBe(
      'https://www.starthn.ba/bs-BA/blog?page=2',
    )
    expect(key('https://www.starthn.ba/bs-BA/blog?category=porez')).toBe(
      'https://www.starthn.ba/bs-BA/blog?category=porez',
    )
  })

  it('does not mutate the request URL', () => {
    const url = new URL('https://www.starthn.ba/bs-BA?utm_source=x')
    htmlCacheKeyUrl(url)
    expect(url.search).toBe('?utm_source=x')
  })
})

describe('isTrackingParam', () => {
  it('recognises tracking parameters only', () => {
    expect(isTrackingParam('utm_content')).toBe(true)
    expect(isTrackingParam('GCLID')).toBe(true)
    expect(isTrackingParam('code')).toBe(false)
    expect(isTrackingParam('utm')).toBe(false)
  })
})

describe('isHtmlCacheable', () => {
  it('caches public pages', () => {
    expect(isHtmlCacheable('/bs-BA')).toBe(true)
    expect(isHtmlCacheable('/bs-BA/services/tax-consulting')).toBe(true)
    expect(isHtmlCacheable('/en-US/blog/importance-of-entrepreneurship-programs')).toBe(true)
  })

  it('never caches private routes, in any case', () => {
    for (const prefix of PRIVATE_ROUTE_PREFIXES) {
      expect(isHtmlCacheable(`/bs-BA${prefix}`), prefix).toBe(false)
      expect(isHtmlCacheable(`/en-US${prefix}/x`), prefix).toBe(false)
      expect(isHtmlCacheable(prefix.toUpperCase()), prefix).toBe(false)
    }
  })

  it('uses a short edge TTL and no browser cache', () => {
    expect(HTML_CACHE_CONTROL).toBe(
      'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    )
  })
})
