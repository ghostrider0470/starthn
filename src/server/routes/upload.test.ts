// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { handleUploadRoute } from './upload'
import { signJwt } from '../auth'

const SECRET = 'test-secret-at-least-32-characters!!'

async function token(extra: Record<string, any> = {}) {
  return signJwt(
    { sub: 'user-1', email: 'a@b.com', permission: [], role: [], ...extra },
    SECRET,
    3600,
  )
}

function makeEnv(overrides: Record<string, any> = {}) {
  const put = vi.fn().mockResolvedValue(undefined)
  const prepare = vi.fn(() => ({
    bind: () => ({
      first: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue({ results: [] }),
      run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
    }),
  }))
  return { DB: { prepare } as any, IMG_CACHE: { put } as any, JWT_SECRET: SECRET, ...overrides }
}

describe('handleUploadRoute', () => {
  it('returns null for non-upload paths', async () => {
    const req = new Request('https://x/api/auth/login', { method: 'POST' })
    expect(await handleUploadRoute(req, makeEnv() as any)).toBeNull()
  })

  it('returns null for GET requests', async () => {
    const req = new Request('https://x/api/upload/image', { method: 'GET' })
    expect(await handleUploadRoute(req, makeEnv() as any)).toBeNull()
  })

  it('returns 401 without Authorization header', async () => {
    const req = new Request('https://x/api/upload/image', { method: 'POST' })
    const res = await handleUploadRoute(req, makeEnv() as any)
    expect(res?.status).toBe(401)
  })

  it('returns 400 for invalid container', async () => {
    const t = await token()
    const fd = new FormData()
    fd.append('container', 'invalid-container')
    const req = new Request('https://x/api/upload/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: fd,
    })
    const res = await handleUploadRoute(req, makeEnv() as any)
    expect(res?.status).toBe(400)
  })

  it('returns 403 for blog-images without manage:blog permission', async () => {
    const t = await token({ permission: [] })
    const fd = new FormData()
    fd.append('container', 'blog-images')
    const req = new Request('https://x/api/upload/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: fd,
    })
    const res = await handleUploadRoute(req, makeEnv() as any)
    expect(res?.status).toBe(403)
  })

  it('returns 400 when no variant files are provided', async () => {
    const t = await token()
    const fd = new FormData()
    fd.append('container', 'avatars')
    const req = new Request('https://x/api/upload/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: fd,
    })
    const res = await handleUploadRoute(req, makeEnv() as any)
    expect(res?.status).toBe(400)
  })

  it('returns 200 with path and url for valid avatar upload', async () => {
    const t = await token({ sub: 'user-1' })
    const fd = new FormData()
    fd.append('container', 'avatars')
    fd.append('w48', new Blob(['px'], { type: 'image/webp' }), 'w48.webp')
    fd.append('w96', new Blob(['px'], { type: 'image/webp' }), 'w96.webp')
    fd.append('w192', new Blob(['px'], { type: 'image/webp' }), 'w192.webp')
    const req = new Request('https://x/api/upload/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: fd,
    })
    const env = makeEnv()
    const res = await handleUploadRoute(req, env as any)
    expect(res?.status).toBe(200)
    const body = await res!.json() as { path: string; url: string }
    expect(body.path).toMatch(/^avatars\/user-1\/[a-f0-9]+$/)
    expect(body.url).toBe(`/img/${body.path}`)
    expect((env.IMG_CACHE.put as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(3)
  })

  it('scopes blog-images path without userId', async () => {
    const t = await token({ sub: 'user-1', permission: ['manage:blog'] })
    const fd = new FormData()
    fd.append('container', 'blog-images')
    fd.append('w400', new Blob(['px'], { type: 'image/webp' }), 'w400.webp')
    const req = new Request('https://x/api/upload/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: fd,
    })
    const env = makeEnv()
    const res = await handleUploadRoute(req, env as any)
    expect(res?.status).toBe(200)
    const body = await res!.json() as { path: string }
    expect(body.path).toMatch(/^blog-images\/[a-f0-9]+$/)
  })
})
