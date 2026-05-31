import { describe, it, expect, vi } from 'vitest'
import { handleProfileRoute } from './profile'

function makeEnv(dbOverride?: any) {
  const prepare = vi.fn(() => ({
    bind: () => ({
      first: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue({ results: [] }),
      run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
    }),
  }))
  return {
    DB: dbOverride ?? { prepare } as any,
    JWT_SECRET: 'test-secret-at-least-32-characters!!',
  }
}

describe('handleProfileRoute', () => {
  it('returns 401 for unauthenticated request to /api/user/profile', async () => {
    const req = new Request('https://x/api/user/profile', { method: 'GET' })
    const res = await handleProfileRoute(req, makeEnv() as any)
    expect(res?.status).toBe(401)
  })

  it('returns 401 for unauthenticated POST /api/user/avatar (no longer proxied)', async () => {
    const req = new Request('https://x/api/user/avatar', { method: 'POST' })
    const res = await handleProfileRoute(req, makeEnv() as any)
    expect(res?.status).toBe(401)
  })

  it('requires auth for /api/user/page/translate before forwarding to Azure', async () => {
    // Azure has no user auth; the Worker authenticates here and forwards the
    // shared secret + X-User-Id. So an unauthenticated request is rejected (401),
    // not proxied.
    const req = new Request('https://x/api/user/page/translate', { method: 'POST' })
    const res = await handleProfileRoute(req, makeEnv() as any)
    expect(res?.status).toBe(401)
  })

  it('returns null for paths not starting with /api/user/', async () => {
    const req = new Request('https://x/api/auth/login', { method: 'POST' })
    const res = await handleProfileRoute(req, makeEnv() as any)
    expect(res).toBeNull()
  })
})
