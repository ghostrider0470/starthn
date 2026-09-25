import { describe, expect, it } from 'vitest'
import {
  API_HEADER_OVERRIDES,
  SECURITY_HEADERS,
  isApiPath,
  securityHeadersFor,
  withSecurityHeaders,
} from './security-headers'

const request = (href: string) => new Request(href)
const page = (path: string) => request(`https://www.starthn.ba${path}`)

describe('SECURITY_HEADERS', () => {
  it('is the agreed set', () => {
    expect(SECURITY_HEADERS).toEqual({
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'SAMEORIGIN',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': "frame-ancestors 'self'",
    })
  })

  it('never restricts what a page may load (Turnstile, GA4, Clarity, inline hydration)', () => {
    const csp = SECURITY_HEADERS['Content-Security-Policy']
    const directives = csp.split(';').map((d) => d.trim().split(/\s+/)[0])
    expect(directives).toEqual(['frame-ancestors'])
  })
})

describe('securityHeadersFor', () => {
  it('sends includeSubDomains from www and preview hosts', () => {
    for (const href of [
      'https://www.starthn.ba/bs-BA',
      'https://starthn.example.workers.dev/bs-BA',
      'http://localhost:3000/bs-BA',
    ]) {
      expect(
        securityHeadersFor(new URL(href))['Strict-Transport-Security'],
        href,
      ).toBe('max-age=31536000; includeSubDomains')
    }
  })

  it('leaves includeSubDomains out on the apex, whose mail hosts have no valid TLS', () => {
    const headers = securityHeadersFor(new URL('https://starthn.ba/bs-BA'))
    expect(headers['Strict-Transport-Security']).toBe('max-age=31536000')
    expect(headers['X-Frame-Options']).toBe('SAMEORIGIN')
    // The shared constant is not modified.
    expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain(
      'includeSubDomains',
    )
  })
})

describe('isApiPath', () => {
  it('matches /api and /api/* only', () => {
    expect(isApiPath('/api')).toBe(true)
    expect(isApiPath('/api/blog')).toBe(true)
    expect(isApiPath('/apixyz')).toBe(false)
    expect(isApiPath('/bs-BA/api')).toBe(false)
  })
})

describe('withSecurityHeaders', () => {
  const expectSecured = (response: Response, label: string) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(response.headers.get(name), `${label}: ${name}`).toBe(value)
    }
  }

  it('secures HTML pages, redirects, 404s and 410s', () => {
    const cases: Array<[string, Response]> = [
      [
        'SSR page',
        new Response('<!doctype html><p>ok</p>', {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'public',
          },
        }),
      ],
      ['301', Response.redirect('https://www.starthn.ba/bs-BA', 301)],
      [
        '404',
        new Response('<h1>404</h1>', {
          status: 404,
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'x-robots-tag': 'noindex',
          },
        }),
      ],
      ['410', new Response('410 Gone', { status: 410 })],
    ]
    for (const [label, response] of cases) {
      const secured = withSecurityHeaders(page('/bs-BA'), response)
      expectSecured(secured, label)
      expect(secured.status, label).toBe(response.status)
    }
  })

  it('keeps status, body and every existing header', async () => {
    const original = new Response('<p>body</p>', {
      status: 404,
      statusText: 'Not Found',
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex',
      },
    })
    original.headers.append('set-cookie', 'a=1')
    original.headers.append('set-cookie', 'b=2')

    const secured = withSecurityHeaders(page('/nope'), original)
    expect(secured.status).toBe(404)
    expect(secured.statusText).toBe('Not Found')
    expect(await secured.text()).toBe('<p>body</p>')
    expect(secured.headers.get('cache-control')).toBe('no-store')
    expect(secured.headers.get('x-robots-tag')).toBe('noindex')
    expect(secured.headers.getSetCookie()).toEqual(['a=1', 'b=2'])
  })

  it('works on responses with immutable headers (redirects, fetch, Cache API)', () => {
    const redirect = Response.redirect('https://www.starthn.ba/bs-BA', 301)
    expect(() => redirect.headers.set('x-test', '1')).toThrow()
    const secured = withSecurityHeaders(page('/'), redirect)
    expect(secured.headers.get('location')).toBe('https://www.starthn.ba/bs-BA')
    expectSecured(secured, 'redirect')
  })

  it('never overrides a header the response already sets', () => {
    const response = new Response('x', {
      headers: { 'X-Frame-Options': 'DENY' },
    })
    const secured = withSecurityHeaders(page('/bs-BA'), response)
    expect(secured.headers.get('X-Frame-Options')).toBe('DENY')
    expect(secured.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('secures /api responses with the same set, never frameable', async () => {
    for (const status of [200, 404, 503]) {
      const response = new Response('{}', {
        status,
        headers: { 'content-type': 'application/json' },
      })
      const secured = withSecurityHeaders(page('/api/health'), response)
      expect(secured.status).toBe(status)
      expect(await secured.text()).toBe('{}')
      for (const [name, value] of Object.entries({
        ...SECURITY_HEADERS,
        ...API_HEADER_OVERRIDES,
      })) {
        expect(secured.headers.get(name), `${status} ${name}`).toBe(value)
      }
    }
    expect(API_HEADER_OVERRIDES).toEqual({
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "frame-ancestors 'none'",
    })
    // Same HSTS as the pages (hono's default was max-age=15552000).
    expect(
      withSecurityHeaders(page('/api/blog'), new Response('{}')).headers.get(
        'Strict-Transport-Security',
      ),
    ).toBe(SECURITY_HEADERS['Strict-Transport-Security'])
  })

  it('leaves WebSocket upgrades untouched', () => {
    const upgrade = { status: 101 } as Response
    expect(withSecurityHeaders(page('/api/chat'), upgrade)).toBe(upgrade)
  })

  it('uses the apex HSTS value on the apex host', () => {
    const secured = withSecurityHeaders(
      request('https://starthn.ba/bs-BA'),
      new Response(null, {
        status: 301,
        headers: { location: 'https://www.starthn.ba/bs-BA' },
      }),
    )
    expect(secured.headers.get('Strict-Transport-Security')).toBe(
      'max-age=31536000',
    )
  })
})
