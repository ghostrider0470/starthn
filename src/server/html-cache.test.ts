import { describe, expect, it } from 'vitest'
import {
  DEPLOYMENT_KEY_PARAM,
  HTML_CACHE_CONTROL,
  deploymentIdFrom,
  htmlCacheKey,
  htmlCacheKeyUrl,
  isHtmlCacheable,
  isTrackingParam,
  withHtmlAccept,
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

describe('htmlCacheKey', () => {
  const page = new URL('https://www.starthn.ba/bs-BA/blog?page=2')

  it('is the key URL itself without a deployment ID', () => {
    expect(htmlCacheKey(page)).toBe('https://www.starthn.ba/bs-BA/blog?page=2')
    expect(htmlCacheKey(page, '')).toBe(
      'https://www.starthn.ba/bs-BA/blog?page=2',
    )
  })

  it('gives every deployment its own key for the same page', () => {
    const a = htmlCacheKey(page, 'version-a')
    const b = htmlCacheKey(page, 'version-b')
    expect(a).not.toBe(b)
    expect(new URL(a).searchParams.get(DEPLOYMENT_KEY_PARAM)).toBe('version-a')
    expect(new URL(a).searchParams.get('page')).toBe('2')
    expect(new URL(a).pathname).toBe('/bs-BA/blog')
  })

  it('does not mutate the key URL', () => {
    htmlCacheKey(page, 'version-a')
    expect(page.toString()).toBe('https://www.starthn.ba/bs-BA/blog?page=2')
  })
})

describe('deploymentIdFrom', () => {
  it('reads the version_metadata binding', () => {
    expect(deploymentIdFrom({ CF_VERSION_METADATA: { id: 'abc-123' } })).toBe(
      'abc-123',
    )
  })

  it('is undefined when the binding is missing or malformed', () => {
    expect(deploymentIdFrom(undefined)).toBeUndefined()
    expect(deploymentIdFrom({})).toBeUndefined()
    expect(deploymentIdFrom({ CF_VERSION_METADATA: {} })).toBeUndefined()
    expect(
      deploymentIdFrom({ CF_VERSION_METADATA: { id: '' } }),
    ).toBeUndefined()
    expect(
      deploymentIdFrom({ CF_VERSION_METADATA: { id: 42 } }),
    ).toBeUndefined()
  })
})

describe('isHtmlCacheable', () => {
  it('caches public pages', () => {
    expect(isHtmlCacheable('/bs-BA')).toBe(true)
    expect(isHtmlCacheable('/bs-BA/services/tax-consulting')).toBe(true)
    expect(
      isHtmlCacheable('/en-US/blog/importance-of-entrepreneurship-programs'),
    ).toBe(true)
  })

  it('never caches private routes, in any case', () => {
    for (const prefix of PRIVATE_ROUTE_PREFIXES) {
      expect(isHtmlCacheable(`/bs-BA${prefix}`), prefix).toBe(false)
      expect(isHtmlCacheable(`/en-US${prefix}/x`), prefix).toBe(false)
      expect(isHtmlCacheable(prefix.toUpperCase()), prefix).toBe(false)
    }
  })
})

describe('HTML_CACHE_CONTROL', () => {
  const directive = (name: string) =>
    Number(new RegExp(`${name}=(\\d+)`).exec(HTML_CACHE_CONTROL)?.[1])

  it('is 10 minutes at the edge and never in the browser', () => {
    expect(HTML_CACHE_CONTROL).toBe('public, max-age=0, s-maxage=600')
  })

  it('never lets a shared cache serve stale HTML (it links hashed /assets)', () => {
    expect(HTML_CACHE_CONTROL).not.toContain('stale-while-revalidate')
    expect(HTML_CACHE_CONTROL).not.toContain('stale-if-error')
  })

  it('keeps the edge TTL short, because nothing purges it on publish', () => {
    expect(directive('s-maxage')).toBeLessThanOrEqual(600)
    expect(directive('max-age')).toBe(0)
  })
})

/**
 * TanStack Start's page guard (executeRouter in
 * @tanstack/start-server-core/dist/esm/createStartHandler.js): a page request
 * whose Accept names neither text/html nor *\/* gets a 500.
 */
function passesStartHtmlGuard(request: Request): boolean {
  const parts = (request.headers.get('Accept') || '*/*').split(',')
  return ['*/*', 'text/html'].some((mime) =>
    parts.some((part) => part.trim().startsWith(mime)),
  )
}

const pageRequest = (
  path: string,
  init: RequestInit & { headers?: Record<string, string> } = {},
) => new Request(`https://www.starthn.ba${path}`, init)

describe('withHtmlAccept', () => {
  const NON_HTML_ACCEPTS = [
    'text/markdown',
    'application/json',
    'text/markdown, text/plain;q=0.9',
    'application/xml;q=0.9',
    'text/plain',
    'image/webp',
  ]

  it('turns every non-HTML Accept on a page GET into text/html', () => {
    for (const accept of NON_HTML_ACCEPTS) {
      const original = pageRequest('/bs-BA/about', {
        headers: { Accept: accept },
      })
      expect(passesStartHtmlGuard(original), accept).toBe(false)

      const rewritten = withHtmlAccept(original)
      expect(rewritten.headers.get('Accept'), accept).toBe('text/html')
      expect(passesStartHtmlGuard(rewritten), accept).toBe(true)
    }
  })

  it('also covers HEAD, */* variants and a missing Accept', () => {
    for (const accept of [
      '*/*',
      '*/*;q=0.8',
      'text/html,application/xhtml+xml',
      '',
    ]) {
      const headers: Record<string, string> = accept ? { Accept: accept } : {}
      for (const method of ['GET', 'HEAD']) {
        const rewritten = withHtmlAccept(
          pageRequest('/en-US/contact', { method, headers }),
        )
        expect(rewritten.headers.get('Accept'), `${method} ${accept}`).toBe(
          'text/html',
        )
      }
    }
  })

  it('keeps the URL, method and every other header', () => {
    const original = pageRequest('/bs-BA/blog?page=2&utm_source=x', {
      headers: {
        Accept: 'text/markdown',
        'Accept-Language': 'hr-HR',
        Cookie: 'consent=granted',
        'User-Agent': 'agent/1.0',
      },
    })
    const rewritten = withHtmlAccept(original)
    expect(rewritten.url).toBe(original.url)
    expect(rewritten.method).toBe('GET')
    expect(rewritten.headers.get('Accept-Language')).toBe('hr-HR')
    expect(rewritten.headers.get('Cookie')).toBe('consent=granted')
    expect(rewritten.headers.get('User-Agent')).toBe('agent/1.0')
    // The incoming request is not modified.
    expect(original.headers.get('Accept')).toBe('text/markdown')
  })

  it('returns the same request when it already asks for text/html', () => {
    const request = pageRequest('/bs-BA', { headers: { Accept: 'text/html' } })
    expect(withHtmlAccept(request)).toBe(request)
  })

  it('leaves /api, server functions and non-GET/HEAD requests untouched', () => {
    const untouched = [
      pageRequest('/api/blog', { headers: { Accept: 'application/json' } }),
      pageRequest('/api', { headers: { Accept: 'application/json' } }),
      pageRequest('/_serverFn/abc123', {
        headers: { Accept: 'application/json' },
      }),
      pageRequest('/_serverFn', { headers: { Accept: 'application/json' } }),
      pageRequest('/bs-BA/contact', {
        method: 'POST',
        body: '{}',
        headers: { Accept: 'application/json' },
      }),
    ]
    for (const request of untouched) {
      expect(withHtmlAccept(request), `${request.method} ${request.url}`).toBe(
        request,
      )
    }
  })

  it('does not mistake page paths that merely start with "api" for /api', () => {
    const request = pageRequest('/apixyz', {
      headers: { Accept: 'application/json' },
    })
    expect(withHtmlAccept(request).headers.get('Accept')).toBe('text/html')
  })
})
