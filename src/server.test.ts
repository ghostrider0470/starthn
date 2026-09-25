// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HTML_CACHE_CONTROL } from './server/html-cache'
import { SECURITY_HEADERS } from './server/security-headers'

/**
 * The Worker pipeline in src/server.ts end to end, with TanStack Start's
 * renderer replaced by a stand-in that applies Start's real Accept guard
 * (executeRouter in @tanstack/start-server-core createStartHandler.js).
 */
const startHandler = vi.hoisted(() => ({
  fetch: vi.fn((request: Request): Promise<Response> => {
    const parts = (request.headers.get('Accept') || '*/*').split(',')
    const acceptsHtml = ['*/*', 'text/html'].some((mime) =>
      parts.some((part) => part.trim().startsWith(mime)),
    )
    if (!acceptsHtml) {
      return Promise.resolve(
        Response.json(
          { error: 'Only HTML requests are supported here' },
          { status: 500 },
        ),
      )
    }
    return Promise.resolve(
      new Response('<!doctype html><html lang="bs"><body>page</body></html>', {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    )
  }),
}))

vi.mock('@tanstack/react-start/server-entry', () => ({
  default: startHandler,
  createServerEntry: (entry: {
    fetch: (...args: Array<unknown>) => unknown
  }) => ({
    fetch: (...args: Array<unknown>) => entry.fetch(...args),
  }),
}))

const cache = {
  match: vi.fn(
    (_key: Request): Promise<Response | undefined> =>
      Promise.resolve(undefined),
  ),
  put: vi.fn(
    (_key: Request, _response: Response): Promise<void> => Promise.resolve(),
  ),
}

const executionCtx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
  props: {},
}

type WorkerFetch = (
  request: Request,
  env: unknown,
  ctx: unknown,
) => Promise<Response>

async function worker(): Promise<WorkerFetch> {
  const { default: entry } = await import('./server')
  return entry.fetch as unknown as WorkerFetch
}

async function get(
  path: string,
  headers: Record<string, string> = {},
  env: Record<string, unknown> = {},
  origin = 'https://www.starthn.ba',
) {
  const fetch = await worker()
  return fetch(new Request(`${origin}${path}`, { headers }), env, executionCtx)
}

function expectSecurityHeaders(response: Response, label: string) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    expect(response.headers.get(name), `${label}: ${name}`).toBe(value)
  }
}

beforeEach(() => {
  vi.stubGlobal('caches', { default: cache })
  cache.match.mockReset().mockResolvedValue(undefined)
  cache.put.mockReset().mockResolvedValue(undefined)
  executionCtx.waitUntil.mockReset()
  startHandler.fetch.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('page requests with a non-HTML Accept header', () => {
  it.each([
    'text/markdown',
    'application/json',
    'text/markdown, text/plain;q=0.9',
    'application/xml',
    'text/plain',
  ])('%s gets the 200 HTML page, not a 500', async (accept) => {
    for (const path of [
      '/bs-BA',
      '/bs-BA/about',
      '/en-US/services/tax-consulting',
    ]) {
      const res = await get(path, { Accept: accept })
      expect(res.status, path).toBe(200)
      expect(res.headers.get('content-type'), path).toContain('text/html')
      expect(res.headers.get('vary') ?? '', path).not.toMatch(/accept/i)
      expect(await res.text(), path).toContain('<!doctype html>')
    }
  })

  it('passes every GET page request to Start as text/html', async () => {
    await get('/bs-BA/contact', {
      Accept: 'text/markdown',
      'Accept-Language': 'hr',
    })
    const [seen] = startHandler.fetch.mock.calls[0]
    expect(seen.headers.get('Accept')).toBe('text/html')
    expect(seen.headers.get('Accept-Language')).toBe('hr')
    expect(new URL(seen.url).pathname).toBe('/bs-BA/contact')
  })

  it('leaves server-function requests as they are', async () => {
    await get('/_serverFn/abc123', { Accept: 'application/json' })
    const [seen] = startHandler.fetch.mock.calls[0]
    expect(seen.headers.get('Accept')).toBe('application/json')
  })
})

describe('security headers on Worker responses', () => {
  it('are sent on rendered pages, with the HTML edge-cache policy', async () => {
    const res = await get('/bs-BA/about')
    expect(res.status).toBe(200)
    expectSecurityHeaders(res, 'page')
    expect(res.headers.get('cache-control')).toBe(HTML_CACHE_CONTROL)
  })

  it('are sent on edge-cache hits', async () => {
    cache.match.mockResolvedValue(
      new Response('<!doctype html><p>cached</p>', {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'public, max-age=14400',
        },
      }),
    )
    const res = await get('/bs-BA/about', { Accept: 'text/markdown' })
    expect(await res.text()).toContain('cached')
    expect(startHandler.fetch).not.toHaveBeenCalled()
    expect(res.headers.get('cache-control')).toBe(HTML_CACHE_CONTROL)
    expectSecurityHeaders(res, 'cache hit')
  })

  it('are sent on canonical 301s, 404s and spam 410s', async () => {
    const redirect = await get('/BS-BA/About')
    expect(redirect.status).toBe(301)
    expect(redirect.headers.get('location')).toBe(
      'https://www.starthn.ba/bs-BA/about',
    )
    expectSecurityHeaders(redirect, '301')

    const notFound = await get('/definitely-not-a-page')
    expect(notFound.status).toBe(404)
    expect(notFound.headers.get('x-robots-tag')).toBe('noindex')
    expectSecurityHeaders(notFound, '404')

    const gone = await get('/items/Y156399317/')
    expect(gone.status).toBe(410)
    expectSecurityHeaders(gone, '410')
  })

  it('are sent on sitemaps', async () => {
    const res = await get('/sitemap.xml')
    expect(res.status).toBe(200)
    expectSecurityHeaders(res, 'sitemap')
  })

  it('secure /api responses like pages, but never frameable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ ok: true }))),
    )
    const res = await get('/api/some-endpoint', { Accept: 'application/json' })
    expect(res.status).toBe(200)
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('content-security-policy')).toBe(
      "frame-ancestors 'none'",
    )
    // One value per header, the same as on pages (hono used to send its own
    // shorter HSTS and no Permissions-Policy).
    expect(res.headers.get('strict-transport-security')).toBe(
      'max-age=31536000; includeSubDomains',
    )
    expect(res.headers.get('permissions-policy')).toBe(
      'camera=(), microphone=(), geolocation=()',
    )
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('referrer-policy')).toBe(
      'strict-origin-when-cross-origin',
    )
    // hono secureHeaders still adds its cross-origin set.
    expect(res.headers.get('cross-origin-opener-policy')).toBe('same-origin')
    expect(startHandler.fetch).not.toHaveBeenCalled()
  })

  it('secure the /api 404 the same way', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('nope', { status: 404 }))),
    )
    const res = await get('/api/health', { Accept: 'application/json' })
    expect(res.status).toBe(404)
    expect(res.headers.get('strict-transport-security')).toBe(
      'max-age=31536000; includeSubDomains',
    )
    expect(res.headers.get('permissions-policy')).toBeTruthy()
  })
})

describe('HTML edge cache', () => {
  it('stores public pages and never private ones', async () => {
    await get('/bs-BA/about')
    expect(cache.put).toHaveBeenCalledTimes(1)
    expect(cache.put.mock.calls[0][0].url).toBe(
      'https://www.starthn.ba/bs-BA/about',
    )

    cache.put.mockClear()
    const login = await get('/bs-BA/login')
    expect(login.headers.get('cache-control')).toBe('private, no-store')
    expect(cache.match).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining('/login') }),
    )
    expect(cache.put).not.toHaveBeenCalled()
  })

  it('scopes keys to the deployment when version metadata is bound', async () => {
    await get('/bs-BA/about', {}, { CF_VERSION_METADATA: { id: 'v-42' } })
    const key = cache.put.mock.calls[0][0]
    expect(new URL(key.url).searchParams.get('__deployment')).toBe('v-42')
    expect(cache.match.mock.calls[0][0].url).toBe(key.url)
  })
})
