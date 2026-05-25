import { describe, it, expect } from 'vitest'
import { signJwt, verifyJwt, loadUserPermissions } from './auth'

const SECRET = 'test-secret-at-least-32-characters!!'

describe('signJwt + verifyJwt', () => {
  it('roundtrip: signs and verifies a token', async () => {
    const token = await signJwt(
      { sub: 'user-1', email: 'a@b.com', role: ['admin'], permission: ['manage:blog'] },
      SECRET,
      3600,
    )
    const payload = await verifyJwt(token, SECRET)
    expect(payload?.sub).toBe('user-1')
    expect(payload?.email).toBe('a@b.com')
    expect(payload?.role).toEqual(['admin'])
    expect(payload?.permission).toEqual(['manage:blog'])
  })

  it('returns null for wrong secret', async () => {
    const token = await signJwt({ sub: 'x', email: 'x@x.com' }, SECRET, 3600)
    expect(await verifyJwt(token, 'wrong-secret-at-least-32-chars!!')).toBeNull()
  })

  it('returns null for expired token', async () => {
    const token = await signJwt({ sub: 'x', email: 'x@x.com' }, SECRET, -1)
    expect(await verifyJwt(token, SECRET)).toBeNull()
  })
})

describe('loadUserPermissions', () => {
  it('returns empty array when user has no roles', async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          all: async () => ({ results: [] }),
        }),
      }),
    } as any
    const perms = await loadUserPermissions('user-1', fakeDb)
    expect(perms).toEqual([])
  })

  it('deduplicates permissions across roles', async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          all: async () => ({
            results: [
              { permissions: '["manage:blog","manage:users"]' },
              { permissions: '["manage:blog","manage:settings"]' },
            ],
          }),
        }),
      }),
    } as any
    const perms = await loadUserPermissions('user-1', fakeDb)
    expect(perms).toContain('manage:blog')
    expect(perms).toContain('manage:users')
    expect(perms).toContain('manage:settings')
    expect(perms.filter(p => p === 'manage:blog').length).toBe(1) // deduplicated
  })

  it('skips malformed JSON permission rows silently', async () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({
          all: async () => ({
            results: [
              { permissions: 'not-valid-json' },
              { permissions: '["manage:blog"]' },
            ],
          }),
        }),
      }),
    } as any
    const perms = await loadUserPermissions('user-1', fakeDb)
    expect(perms).toEqual(['manage:blog'])
  })
})
