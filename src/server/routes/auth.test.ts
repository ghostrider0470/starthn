import { describe, it, expect, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { handleAuthRoute } from './auth'

function mockDb(overrides: Record<string, any> = {}) {
  const prepare = vi.fn((sql: string) => ({
    bind: (...params: unknown[]) => ({
      first: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue({ results: [] }),
      run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
    }),
  }))
  const insert = vi.fn().mockResolvedValue([{ id: 'new-user-id' }])
  const batch = vi.fn().mockResolvedValue([{ meta: { changes: 1 } }])
  return { prepare, insert, batch, ...overrides }
}

const ENV = {
  DB: mockDb() as any,
  JWT_SECRET: 'test-secret-at-least-32-characters!!',
  ADMIN_EMAILS: '',
}

function base64Url(value: string) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fakeJwtPayload(payload: Record<string, unknown>) {
  return [
    base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' })),
    base64Url(JSON.stringify(payload)),
    'signature',
  ].join('.')
}

describe('POST /api/auth/login', () => {
  it('returns 400 when credentials missing', async () => {
    const req = new Request('https://x/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com' }),
    })
    const res = await handleAuthRoute(req, ENV as any)
    expect(res?.status).toBe(400)
  })

  it('returns 401 for unknown email', async () => {
    const db = mockDb()
    const req = new Request('https://x/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@x.com', password: 'pass' }),
    })
    const res = await handleAuthRoute(req, { ...ENV, DB: db } as any)
    expect(res?.status).toBe(401)
  })
})

describe('POST /api/auth/register', () => {
  it('returns 409 when email already exists', async () => {
    const db = mockDb()
    ;(db.prepare as any).mockImplementation(() => ({
      bind: () => ({
        first: vi.fn().mockResolvedValue({ id: 'existing' }),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
      }),
    }))
    const req = new Request('https://x/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'pass', firstName: 'A', lastName: 'B' }),
    })
    const res = await handleAuthRoute(req, { ...ENV, DB: db } as any)
    expect(res?.status).toBe(409)
  })
})

describe('handleAuthRoute returns null for unknown routes', () => {
  it('returns null for GET /api/auth/unknown', async () => {
    const req = new Request('https://x/api/auth/unknown', { method: 'GET' })
    const res = await handleAuthRoute(req, ENV as any)
    expect(res).toBeNull()
  })
})

describe('POST /api/auth/external-login', () => {
  it('accepts the current client contract with provider casing and idToken', async () => {
    const idToken = fakeJwtPayload({
      email: 'oauth@example.com',
      given_name: 'OAuth',
      family_name: 'User',
    })
    const req = new Request('https://x/api/auth/external-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'Microsoft', idToken }),
    })
    const res = await handleAuthRoute(req, ENV as any)
    expect(res?.status).not.toBe(400)
  })

  it('returns 400 when accessToken is missing', async () => {
    const req = new Request('https://x/api/auth/external-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'google' }),
    })
    const res = await handleAuthRoute(req, ENV as any)
    expect(res?.status).toBe(400)
    const body = await res?.json() as { error?: string }
    expect(body.error).toMatch(/accessToken/i)
  })

  it('returns 400 when provider is missing', async () => {
    const req = new Request('https://x/api/auth/external-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: 'some-token' }),
    })
    const res = await handleAuthRoute(req, ENV as any)
    expect(res?.status).toBe(400)
  })

  it('returns 400 for unsupported provider', async () => {
    const req = new Request('https://x/api/auth/external-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'twitter', accessToken: 'some-token' }),
    })
    const res = await handleAuthRoute(req, ENV as any)
    expect(res?.status).toBe(400)
    const body = await res?.json() as { error?: string }
    expect(body.error).toMatch(/unsupported provider/i)
  })
})

describe('POST /api/auth/exchange-code', () => {
  it('accepts Microsoft provider casing and forwards the PKCE verifier', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'access-token',
          id_token: 'id-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile email',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const req = new Request('https://x/api/auth/exchange-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'Microsoft',
        code: 'auth-code',
        redirectUri: 'https://x/auth/callback',
        codeVerifier: 'pkce-verifier',
      }),
    })

    const res = await handleAuthRoute(req, {
      ...ENV,
      MICROSOFT_CLIENT_ID: 'client-id',
      MICROSOFT_CLIENT_SECRET: 'client-secret',
    } as any)

    expect(res?.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/aa722524-5f12-410b-b06c-d5a8d54b1ddf/oauth2/v2.0/token')
    const params = init.body as URLSearchParams
    expect(params.get('code_verifier')).toBe('pkce-verifier')
    expect(params.get('scope')).toBe('openid profile email')

    vi.unstubAllGlobals()
  })
})

describe('POST /api/auth/revoke-token', () => {
  it('returns 401 when no Authorization header is present', async () => {
    const req = new Request('https://x/api/auth/revoke-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await handleAuthRoute(req, ENV as any)
    expect(res?.status).toBe(401)
    const body = await res?.json() as { error?: string }
    expect(body.error).toMatch(/missing authorization/i)
  })

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    const req = new Request('https://x/api/auth/revoke-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Basic abc123' },
    })
    const res = await handleAuthRoute(req, ENV as any)
    expect(res?.status).toBe(401)
  })

  it('returns 401 when JWT is invalid', async () => {
    const req = new Request('https://x/api/auth/revoke-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer not.a.valid.jwt' },
    })
    const res = await handleAuthRoute(req, ENV as any)
    expect(res?.status).toBe(401)
    const body = await res?.json() as { error?: string }
    expect(body.error).toMatch(/invalid or expired/i)
  })
})
