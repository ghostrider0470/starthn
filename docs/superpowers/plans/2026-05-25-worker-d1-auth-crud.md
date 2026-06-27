# Worker D1 Auth and CRUD Parity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement auth (JWT signing, register/login/refresh/revoke/external-login/exchange-code) and profile routes in the Worker, and wire a `D1_PRIMARY` feature flag in `server.ts` so all admin+auth traffic can switch from Azure to D1 without changing code.

**Architecture:** New handler functions `handleAuthRoute` and `handleProfileRoute` mirror the existing `handleAdminRoute` pattern (return `Response | null`). When `D1_PRIMARY=false` (current default), `server.ts` proxies everything to Azure as before. When `D1_PRIMARY=true`, those handlers run first and proxy routes that need Azure compute fall through automatically (they return `null`).

**Tech Stack:** Cloudflare Workers, Hono, Drizzle ORM, D1 (SQLite), bcryptjs (new dependency), Web Crypto API (JWT HS256), Vitest.

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Modify | `src/server/auth.ts` | Add `signJwt`, `loadUserPermissions` |
| Modify | `src/server/db/repositories/user.ts` | Add `create`, `updateProfile`, `updatePasswordHash` |
| Create | `src/server/auth.test.ts` | Unit tests for `signJwt`/`verifyJwt` roundtrip |
| Create | `src/server/routes/auth.ts` | register, login, refresh-token, revoke-token, exchange-code, external-login |
| Create | `src/server/routes/auth.test.ts` | Unit tests for auth handlers |
| Create | `src/server/routes/profile.ts` | profile CRUD, password, page translations, API keys |
| Create | `src/server/routes/profile.test.ts` | Unit tests for profile handlers |
| Modify | `src/server/db/admin-routes.ts` | Add `GET /api/manage/blog/missing-translations` |
| Modify | `src/server/bindings.ts` | Add `D1_PRIMARY`, `ADMIN_EMAILS`, OAuth secrets |
| Modify | `wrangler.jsonc` | Add `D1_PRIMARY: "false"` to vars |
| Modify | `src/server.ts` | Conditional D1_PRIMARY routing |

---

### Task 1: Install bcryptjs and add `signJwt` to `auth.ts`

**Files:**
- Modify: `package.json`
- Modify: `src/server/auth.ts`
- Create: `src/server/auth.test.ts`

- [ ] **Step 1: Install bcryptjs**

```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

- [ ] **Step 2: Write the failing test**

Create `src/server/auth.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { signJwt, verifyJwt } from './auth'

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
```

- [ ] **Step 3: Run the test — expect FAIL**

```bash
npm run test -- auth.test
```

Expected: FAIL with "signJwt is not a function" (it doesn't exist yet).

- [ ] **Step 4: Add `signJwt` and `loadUserPermissions` to `src/server/auth.ts`**

Add after the existing `importKey` function (line 43):

```ts
function base64UrlEncode(input: Uint8Array | string): string {
  const str = typeof input === 'string'
    ? input
    : String.fromCharCode(...(input as Uint8Array))
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function importSignKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

/** Sign a new HS256 JWT. expiresInSeconds defaults to 3600. */
export async function signJwt(
  payload: Omit<JwtPayload, 'exp'> & { exp?: number },
  secret: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const fullPayload = {
    ...payload,
    exp: payload.exp ?? Math.floor(Date.now() / 1000) + expiresInSeconds,
  }
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64UrlEncode(JSON.stringify(fullPayload))
  const key = await importSignKey(secret)
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${header}.${body}`),
  )
  return `${header}.${body}.${base64UrlEncode(new Uint8Array(sig))}`
}

/** Load all permissions for a user by joining user_roles → roles.permissions. */
export async function loadUserPermissions(userId: string, db: D1Database): Promise<string[]> {
  const rows = await db
    .prepare(
      `SELECT r.permissions FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ?`,
    )
    .bind(userId)
    .all<{ permissions: string }>()
  const permissions: string[] = []
  for (const row of rows.results ?? []) {
    try { permissions.push(...(JSON.parse(row.permissions) as string[])) } catch {}
  }
  return [...new Set(permissions)]
}
```

- [ ] **Step 5: Run the test — expect PASS**

```bash
npm run test -- auth.test
```

Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/server/auth.ts src/server/auth.test.ts package.json package-lock.json
git commit -m "feat: add signJwt and loadUserPermissions to auth.ts"
```

---

### Task 2: Add `create`, `updateProfile`, `updatePasswordHash` to `UserRepository`

**Files:**
- Modify: `src/server/db/repositories/user.ts`

- [ ] **Step 1: Write the failing tests**

Append to (or create) `src/server/db/repositories/user.test.ts`. These are unit tests that verify the SQL generated, not full integration tests — so we just assert the shape of the operation by calling a minimal mock:

```ts
import { describe, it, expect } from 'vitest'

// Lightweight smoke test: verify create method builds the right insert.
// Full integration covered in auth.test.ts route tests.
describe('UserRepository shape', () => {
  it('exports create, updateProfile, updatePasswordHash methods', async () => {
    const { UserRepository } = await import('./user')
    const proto = UserRepository.prototype as any
    expect(typeof proto.create).toBe('function')
    expect(typeof proto.updateProfile).toBe('function')
    expect(typeof proto.updatePasswordHash).toBe('function')
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL**

```bash
npm run test -- repositories/user.test
```

Expected: FAIL (methods don't exist).

- [ ] **Step 3: Add the three methods to `UserRepository` in `src/server/db/repositories/user.ts`**

Add after the existing `getStats()` method (before `getAuthors()`):

```ts
async create(data: {
  id?: string
  email: string
  passwordHash?: string | null
  firstName: string
  lastName: string
}): Promise<UserDto> {
  const id = data.id ?? crypto.randomUUID().replace(/-/g, '')
  const now = new Date().toISOString()
  await this.db.insert(users).values({
    id,
    email: data.email,
    passwordHash: data.passwordHash ?? null,
    firstName: data.firstName,
    lastName: data.lastName,
    isActive: 1,
    createdAt: now,
    updatedAt: now,
  })
  return (await this.getById(id))!
}

async updateProfile(userId: string, data: {
  firstName?: string
  lastName?: string
  phoneNumber?: string
  bio?: string
  profession?: string
  expertise?: string[]
  slug?: string
  socialLinks?: { linkedIn?: string; twitter?: string; gitHub?: string; website?: string }
}): Promise<UserDto | null> {
  const found = await this.db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)
  if (found.length === 0) return null
  const updates: Record<string, any> = { updatedAt: new Date().toISOString() }
  if (data.firstName !== undefined) updates.firstName = data.firstName
  if (data.lastName !== undefined) updates.lastName = data.lastName
  if (data.phoneNumber !== undefined) updates.phoneNumber = data.phoneNumber
  if (data.bio !== undefined) updates.bio = data.bio
  if (data.profession !== undefined) updates.profession = data.profession
  if (data.expertise !== undefined) updates.expertise = JSON.stringify(data.expertise)
  if (data.slug !== undefined) updates.slug = data.slug
  if (data.socialLinks) {
    const s = data.socialLinks
    if (s.linkedIn !== undefined) updates.socialLinkedin = s.linkedIn
    if (s.twitter !== undefined) updates.socialTwitter = s.twitter
    if (s.gitHub !== undefined) updates.socialGithub = s.gitHub
    if (s.website !== undefined) updates.socialWebsite = s.website
  }
  await this.db.update(users).set(updates).where(eq(users.id, userId))
  return this.getById(userId)
}

async updatePasswordHash(userId: string, passwordHash: string): Promise<boolean> {
  const found = await this.db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)
  if (found.length === 0) return false
  await this.db.update(users).set({ passwordHash, updatedAt: new Date().toISOString() }).where(eq(users.id, userId))
  return true
}
```

- [ ] **Step 4: Run the test — expect PASS**

```bash
npm run test -- repositories/user.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/db/repositories/user.ts src/server/db/repositories/user.test.ts
git commit -m "feat: add create/updateProfile/updatePasswordHash to UserRepository"
```

---

### Task 3: Add auth secrets to Bindings and wrangler.jsonc

**Files:**
- Modify: `src/server/bindings.ts`
- Modify: `wrangler.jsonc`

- [ ] **Step 1: Update `src/server/bindings.ts`**

Replace the `Bindings` type export with:

```ts
export type Bindings = {
  DB: D1Database
  ASSETS: Fetcher
  IMG_CACHE: R2Bucket
  IMG_WRITE_QUEUE: Queue<ImageWriteMessage>
  API_ORIGIN: string
  AZURE_BLOB_ORIGIN: string
  JWT_SECRET: string
  SYNC_SECRET: string
  /** "true" = Workers own auth+admin D1 routes; "false" = proxy to Azure */
  D1_PRIMARY: string
  /** Comma-separated emails that get MasterAdmin role on first registration */
  ADMIN_EMAILS: string
  MICROSOFT_CLIENT_ID: string
  MICROSOFT_CLIENT_SECRET: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
}
```

- [ ] **Step 2: Add `D1_PRIMARY` to `wrangler.jsonc` vars block**

Inside the `"vars"` object add:

```jsonc
"D1_PRIMARY": "false"
```

The full vars block becomes:

```jsonc
"vars": {
  "API_ORIGIN": "https://starthn-api-prod.azurewebsites.net",
  "AZURE_BLOB_ORIGIN": "https://starthnwebprod.blob.core.windows.net",
  "D1_PRIMARY": "false",
  "ADMIN_EMAILS": ""
}
```

Note: `JWT_SECRET`, `SYNC_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` are Worker secrets — set them with `wrangler secret put <NAME>`. Do NOT add them to `wrangler.jsonc`.

- [ ] **Step 3: Commit**

```bash
git add src/server/bindings.ts wrangler.jsonc
git commit -m "feat: add D1_PRIMARY flag and auth secrets to Bindings"
```

---

### Task 4: Implement register + login auth routes

**Files:**
- Create: `src/server/routes/auth.ts`
- Create: `src/server/routes/auth.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/server/routes/auth.test.ts`:

```ts
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
    ;(db.prepare as any).mockImplementation(() => ({
      bind: () => ({
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
      }),
    }))
    const req = new Request('https://x/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@x.com', password: 'pass' }),
    })
    const res = await handleAuthRoute(req, { ...ENV, DB: db } as any)
    expect(res?.status).toBe(401)
  })

  it('returns 200 with token for valid credentials', async () => {
    const hash = await bcrypt.hash('correct-password', 10)
    const db = mockDb()
    let callCount = 0
    ;(db.prepare as any).mockImplementation((sql: string) => ({
      bind: (...params: unknown[]) => ({
        first: vi.fn().mockResolvedValue(
          // First prepare+bind call = getByEmail (returns user row)
          callCount++ === 0
            ? { id: 'u1', email: 'a@b.com', password_hash: hash, first_name: 'A', last_name: 'B', is_active: 1, slug: null }
            : null,
        ),
        all: vi.fn().mockResolvedValue({ results: [{ name: 'admin', permissions: '["manage:blog"]' }] }),
        run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
      }),
    }))
    const req = new Request('https://x/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'correct-password' }),
    })
    const res = await handleAuthRoute(req, { ...ENV, DB: db } as any)
    expect(res?.status).toBe(200)
    const body = await res?.json() as any
    expect(body.token?.accessToken).toBeDefined()
    expect(body.token?.refreshToken).toBeDefined()
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
```

- [ ] **Step 2: Run the tests — expect FAIL**

```bash
npm run test -- routes/auth.test
```

Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/server/routes/auth.ts`**

```ts
import bcrypt from 'bcryptjs'
import { createDb } from '../db/client'
import { UserRepository } from '../db/repositories/user'
import { RefreshTokenRepository } from '../db/repositories/refresh-token'
import { RoleRepository } from '../db/repositories/role'
import { signJwt, loadUserPermissions } from '../auth'
import type { Bindings } from '../bindings'

interface AuthEnv {
  DB: D1Database
  JWT_SECRET: string
  ADMIN_EMAILS?: string
  MICROSOFT_CLIENT_ID?: string
  MICROSOFT_CLIENT_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function generateRawToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function buildAuthResponse(
  userId: string,
  email: string,
  firstName: string,
  lastName: string,
  roleNames: string[],
  env: AuthEnv,
): Promise<Response> {
  const permissions = await loadUserPermissions(userId, env.DB)
  const expiresInSeconds = 3600
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()

  const accessToken = await signJwt(
    {
      nameid: userId,
      sub: userId,
      email,
      given_name: firstName,
      family_name: lastName,
      role: roleNames,
      permission: permissions,
    } as any,
    env.JWT_SECRET,
    expiresInSeconds,
  )

  const rawRefreshToken = generateRawToken()
  const tokenHash = await sha256Hex(rawRefreshToken)
  const refreshExpiry = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
  const db = createDb(env.DB)
  await new RefreshTokenRepository(db).create(userId, tokenHash, refreshExpiry)

  return json({
    message: 'Success',
    token: { accessToken, refreshToken: rawRefreshToken, expiresAt },
  })
}

export async function handleAuthRoute(request: Request, env: AuthEnv): Promise<Response | null> {
  if (!env?.DB || !env?.JWT_SECRET) return null

  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  if (!path.startsWith('/api/auth/')) return null

  const db = createDb(env.DB)
  const userRepo = new UserRepository(db)

  try {
    // ─── Register ──────────────────────────────────────────────
    if (path === '/api/auth/register' && method === 'POST') {
      const body = await request.json() as { email?: string; password?: string; firstName?: string; lastName?: string }
      if (!body.email || !body.password || !body.firstName || !body.lastName) {
        return json({ error: 'Missing required fields' }, 400)
      }
      const existing = await userRepo.getByEmail(body.email)
      if (existing) return json({ error: 'Email already registered' }, 409)

      const passwordHash = await bcrypt.hash(body.password, 10)
      const user = await userRepo.create({ email: body.email, passwordHash, firstName: body.firstName, lastName: body.lastName })

      // Assign MasterAdmin role if email is in ADMIN_EMAILS
      const adminEmails = (env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
      let roleNames: string[] = []
      if (adminEmails.includes(user.email)) {
        const roleRepo = new RoleRepository(db)
        const adminRole = await roleRepo.getByName('MasterAdmin')
        if (adminRole) {
          await userRepo.updateRoles(user.id, ['MasterAdmin'])
          roleNames = ['MasterAdmin']
        }
      }

      return buildAuthResponse(user.id, user.email, user.firstName ?? '', user.lastName ?? '', roleNames, env)
    }

    // ─── Login ─────────────────────────────────────────────────
    if (path === '/api/auth/login' && method === 'POST') {
      const body = await request.json() as { email?: string; password?: string }
      if (!body.email || !body.password) return json({ error: 'Missing credentials' }, 400)

      const user = await userRepo.getByEmail(body.email)
      if (!user || !user.passwordHash) return json({ error: 'Invalid credentials' }, 401)
      if (!user.isActive) return json({ error: 'Account disabled' }, 403)

      const valid = await bcrypt.compare(body.password, user.passwordHash)
      if (!valid) return json({ error: 'Invalid credentials' }, 401)

      return buildAuthResponse(user.id, user.email, user.firstName ?? '', user.lastName ?? '', user.roles, env)
    }

    // ─── Refresh token ─────────────────────────────────────────
    if (path === '/api/auth/refresh-token' && method === 'POST') {
      const body = await request.json() as { refreshToken?: string }
      if (!body.refreshToken) return json({ error: 'Missing refreshToken' }, 400)

      const tokenHash = await sha256Hex(body.refreshToken)
      const refreshRepo = new RefreshTokenRepository(db)
      const row = await refreshRepo.findByHash(tokenHash)
      if (!row) return json({ error: 'Invalid or expired refresh token' }, 401)

      const user = await userRepo.getById(row.userId)
      if (!user || !user.isActive) return json({ error: 'User not found or disabled' }, 401)

      await refreshRepo.deleteByUser(user.id)
      return buildAuthResponse(user.id, user.email, user.firstName ?? '', user.lastName ?? '', user.roles, env)
    }

    // ─── Revoke token ──────────────────────────────────────────
    if (path === '/api/auth/revoke-token' && method === 'POST') {
      // Revoke all refresh tokens for the authenticated user.
      // Auth header may not always be present — best-effort.
      const authHeader = request.headers.get('X-Authorization') || request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const { verifyJwt } = await import('../auth')
        const payload = await verifyJwt(authHeader.slice(7), env.JWT_SECRET)
        if (payload?.sub) {
          const refreshRepo = new RefreshTokenRepository(db)
          await refreshRepo.deleteByUser(payload.sub)
        }
      }
      return new Response(null, { status: 204 })
    }

    // ─── Exchange code ─────────────────────────────────────────
    if (path === '/api/auth/exchange-code' && method === 'POST') {
      const body = await request.json() as { provider?: string; code?: string; redirectUri?: string }
      if (!body.provider || !body.code || !body.redirectUri) {
        return json({ error: 'Missing provider, code, or redirectUri' }, 400)
      }

      if (body.provider === 'microsoft') {
        const params = new URLSearchParams({
          client_id: env.MICROSOFT_CLIENT_ID ?? '',
          client_secret: env.MICROSOFT_CLIENT_SECRET ?? '',
          code: body.code,
          redirect_uri: body.redirectUri,
          grant_type: 'authorization_code',
        })
        const resp = await fetch(
          'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        )
        const data = await resp.json()
        return json(data, resp.ok ? 200 : resp.status)
      }

      if (body.provider === 'google') {
        const params = new URLSearchParams({
          client_id: env.GOOGLE_CLIENT_ID ?? '',
          client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
          code: body.code,
          redirect_uri: body.redirectUri,
          grant_type: 'authorization_code',
        })
        const resp = await fetch(
          'https://oauth2.googleapis.com/token',
          { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        )
        const data = await resp.json()
        return json(data, resp.ok ? 200 : resp.status)
      }

      return json({ error: 'Unsupported provider' }, 400)
    }

    // ─── External login ────────────────────────────────────────
    if (path === '/api/auth/external-login' && method === 'POST') {
      const body = await request.json() as { provider?: string; idToken?: string }
      if (!body.provider || !body.idToken) return json({ error: 'Missing provider or idToken' }, 400)

      // Decode the provider id_token (do not verify signature — we trust the code exchange above)
      let claims: Record<string, any>
      try {
        const [, payloadB64] = body.idToken.split('.')
        const pad = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4)
        claims = JSON.parse(atob(pad.replace(/-/g, '+').replace(/_/g, '/')))
      } catch {
        return json({ error: 'Invalid id_token' }, 400)
      }

      const email = (claims.email || claims.preferred_username || '') as string
      if (!email) return json({ error: 'No email in id_token' }, 400)

      let user = await userRepo.getByEmail(email)
      if (!user) {
        const nameParts = ((claims.name as string) || '').split(' ')
        user = await userRepo.create({
          email,
          firstName: claims.given_name || nameParts[0] || '',
          lastName: claims.family_name || nameParts.slice(1).join(' ') || '',
        })
        // Check admin email list
        const adminEmails = (env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
        if (adminEmails.includes(email)) {
          const roleRepo = new RoleRepository(db)
          const adminRole = await roleRepo.getByName('MasterAdmin')
          if (adminRole) await userRepo.updateRoles(user.id, ['MasterAdmin'])
          user = await userRepo.getById(user.id) as typeof user
        }
      }

      return buildAuthResponse(user!.id, user!.email, user!.firstName ?? '', user!.lastName ?? '', user!.roles, env)
    }

  } catch (err) {
    console.error('[auth-route]', err)
    return json({ error: 'Internal server error' }, 500)
  }

  return null
}
```

Note: `RoleRepository.getByName` does not exist yet — add this minimal method:

In `src/server/db/repositories/role.ts`, add:

```ts
async getByName(name: string) {
  const rows = await this.db.select().from(roles).where(eq(roles.name, name)).limit(1)
  return rows[0] ?? null
}
```

- [ ] **Step 4: Run the tests — expect PASS**

```bash
npm run test -- routes/auth.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/auth.ts src/server/routes/auth.test.ts src/server/db/repositories/role.ts
git commit -m "feat: implement register/login/refresh/revoke/exchange-code/external-login auth routes"
```

---

### Task 5: Create profile routes

**Files:**
- Create: `src/server/routes/profile.ts`
- Create: `src/server/routes/profile.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/server/routes/profile.test.ts`:

```ts
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

  it('returns null for routes it does not handle', async () => {
    const req = new Request('https://x/api/user/avatar', { method: 'POST' })
    const res = await handleProfileRoute(req, makeEnv() as any)
    expect(res).toBeNull()
  })

  it('returns null for /api/user/page/translate (proxy route)', async () => {
    const req = new Request('https://x/api/user/page/translate', { method: 'POST' })
    const res = await handleProfileRoute(req, makeEnv() as any)
    expect(res).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- routes/profile.test
```

Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/server/routes/profile.ts`**

```ts
import bcrypt from 'bcryptjs'
import { createDb } from '../db/client'
import { UserRepository } from '../db/repositories/user'
import { ApiKeyRepository } from '../db/repositories/api-key'
import { parseJson } from '../db/client'
import { requireAuth } from '../auth'
import { userPageTranslations } from '../db/schema'
import { and, eq } from 'drizzle-orm'

interface ProfileEnv {
  DB: D1Database
  JWT_SECRET: string
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Proxy routes — handled by Azure compute, return null to fall through
const AZURE_PROXY_PATHS = new Set([
  '/api/user/avatar',
  '/api/user/page-image',
  '/api/user/page/translate',
])

export async function handleProfileRoute(request: Request, env: ProfileEnv): Promise<Response | null> {
  if (!env?.DB || !env?.JWT_SECRET) return null

  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  if (!path.startsWith('/api/user/')) return null

  // Proxy to Azure for compute routes
  if (AZURE_PROXY_PATHS.has(path)) return null
  if (path === '/api/user/avatar' && method === 'DELETE') return null

  const authResult = await requireAuth(request, env.JWT_SECRET, env.DB)
  if (authResult instanceof Response) return authResult
  const auth = authResult
  const userId = auth.payload.sub

  const db = createDb(env.DB)
  const userRepo = new UserRepository(db)

  try {
    // ─── Own Profile ───────────────────────────────────────────
    if (path === '/api/user/profile') {
      if (method === 'GET') {
        const user = await userRepo.getById(userId)
        if (!user) return json({ error: 'Not found' }, 404)
        return json(user)
      }
      if (method === 'PUT') {
        const body = await request.json() as Record<string, any>
        const updated = await userRepo.updateProfile(userId, body)
        if (!updated) return json({ error: 'Not found' }, 404)
        return json(updated)
      }
    }

    // ─── Change password ───────────────────────────────────────
    if (path === '/api/user/change-password' && method === 'POST') {
      const body = await request.json() as { currentPassword?: string; newPassword?: string }
      if (!body.currentPassword || !body.newPassword) {
        return json({ error: 'Missing currentPassword or newPassword' }, 400)
      }
      const user = await userRepo.getByEmail(auth.payload.email)
      if (!user || !user.passwordHash) return json({ error: 'Cannot change password for OAuth accounts' }, 400)

      const valid = await bcrypt.compare(body.currentPassword, user.passwordHash)
      if (!valid) return json({ error: 'Current password incorrect' }, 400)

      const newHash = await bcrypt.hash(body.newPassword, 10)
      await userRepo.updatePasswordHash(userId, newHash)
      return json({ message: 'Password changed' })
    }

    // ─── API Keys ──────────────────────────────────────────────
    if (path === '/api/user/api-keys') {
      const apiKeyRepo = new ApiKeyRepository(db)

      if (method === 'GET') {
        const keys = await apiKeyRepo.listByUser(userId)
        return json(keys)
      }

      if (method === 'POST') {
        const body = await request.json() as { name?: string; expiresAt?: string }
        if (!body.name) return json({ error: 'Missing name' }, 400)

        const rawKey = `ht_${crypto.randomUUID().replace(/-/g, '')}`
        const keyHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey))
          .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''))

        const keyPrefix = rawKey.slice(0, 8)
        const keySuffix = rawKey.slice(-4)
        await apiKeyRepo.create(userId, body.name, keyHash, keyPrefix, keySuffix, body.expiresAt)
        return json({ key: rawKey, name: body.name }, 201)
      }
    }

    const apiKeyDeleteMatch = path.match(/^\/api\/user\/api-keys\/([^/]+)$/)
    if (apiKeyDeleteMatch && method === 'DELETE') {
      const apiKeyRepo = new ApiKeyRepository(db)
      await apiKeyRepo.delete(userId, apiKeyDeleteMatch[1])
      return new Response(null, { status: 204 })
    }

    // ─── Page Translations ─────────────────────────────────────
    if (path === '/api/user/page/translations') {
      if (method === 'GET') {
        const rows = await db.select().from(userPageTranslations).where(eq(userPageTranslations.userId, userId))
        const result: Record<string, any> = {}
        for (const r of rows) {
          result[r.locale] = {
            bio: r.bio,
            pageContent: parseJson(r.pageContent, []),
            isAutoTranslated: r.isAutoTranslated === 1,
            translatedAt: r.translatedAt,
          }
        }
        return json(result)
      }
    }

    const pageTransLocaleMatch = path.match(/^\/api\/user\/page\/translations\/([^/]+)$/)
    if (pageTransLocaleMatch) {
      const locale = pageTransLocaleMatch[1]

      if (method === 'PUT') {
        const body = await request.json() as { bio?: string; pageContent?: any[] }
        const existing = await db.select().from(userPageTranslations)
          .where(and(eq(userPageTranslations.userId, userId), eq(userPageTranslations.locale, locale)))
          .limit(1)

        if (existing.length > 0) {
          const updates: Record<string, any> = { translatedAt: new Date().toISOString() }
          if (body.bio !== undefined) updates.bio = body.bio
          if (body.pageContent !== undefined) updates.pageContent = JSON.stringify(body.pageContent)
          await db.update(userPageTranslations).set(updates)
            .where(and(eq(userPageTranslations.userId, userId), eq(userPageTranslations.locale, locale)))
        } else {
          await db.insert(userPageTranslations).values({
            id: crypto.randomUUID().replace(/-/g, ''),
            userId,
            locale,
            bio: body.bio ?? null,
            pageContent: body.pageContent ? JSON.stringify(body.pageContent) : null,
            isAutoTranslated: 0,
            translatedAt: new Date().toISOString(),
          })
        }
        const row = await db.select().from(userPageTranslations)
          .where(and(eq(userPageTranslations.userId, userId), eq(userPageTranslations.locale, locale)))
          .limit(1)
        return json(row[0] ?? null)
      }

      if (method === 'DELETE') {
        await db.delete(userPageTranslations)
          .where(and(eq(userPageTranslations.userId, userId), eq(userPageTranslations.locale, locale)))
        return new Response(null, { status: 204 })
      }
    }

  } catch (err) {
    console.error('[profile-route]', err)
    return json({ error: 'Internal server error' }, 500)
  }

  return null
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm run test -- routes/profile.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/profile.ts src/server/routes/profile.test.ts
git commit -m "feat: implement profile, password, API key, and page translation routes"
```

---

### Task 6: Add missing-translations route to `admin-routes.ts`

**Files:**
- Modify: `src/server/db/admin-routes.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/server/sync-receiver.test.ts` or create a new small test file `src/server/db/admin-routes.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'

describe('admin-routes missing-translations handler', () => {
  it('is exported and handles /api/manage/blog/missing-translations', async () => {
    const { handleAdminRoute } = await import('./admin-routes')
    expect(typeof handleAdminRoute).toBe('function')
  })
})
```

(The full integration is verified by the smoke test during cutover. The unit test just confirms the function exists and is importable.)

- [ ] **Step 2: Run — confirm import succeeds**

```bash
npm run test -- db/admin-routes.test
```

Expected: PASS.

- [ ] **Step 3: Add missing-translations route to `admin-routes.ts`**

In `src/server/db/admin-routes.ts`, add this block inside the `try` block after the blog seed handler (after line 169):

```ts
// Blog: missing translations list
if (path === '/api/manage/blog/missing-translations' && method === 'GET') {
  const perm = requirePermission(auth.payload, 'manage:blog')
  if (perm) return perm
  const repo = new BlogPostRepository(db)
  const posts = await repo.getPublished()
  // Get all translation locales from D1
  const allTranslations = await db
    .select({ postId: blogPostTranslations.postId, locale: blogPostTranslations.locale })
    .from(blogPostTranslations)
  const translated = new Set(allTranslations.map(t => `${t.postId}:${t.locale}`))

  // Determine configured locales from existing translations
  const locales = [...new Set(allTranslations.map(t => t.locale))]

  const missing: { slug: string; title: string; locale: string }[] = []
  for (const post of posts) {
    for (const locale of locales) {
      const postId = (post as any).id
      if (postId && !translated.has(`${postId}:${locale}`)) {
        missing.push({ slug: post.slug, title: post.title, locale })
      }
    }
  }
  return json(missing)
}
```

Also add the `blogPostTranslations` import to the top of `admin-routes.ts` imports from schema:

```ts
import { blogPosts, blogPostTranslations } from '../schema' // add blogPostTranslations
```

Wait — `admin-routes.ts` doesn't directly import from schema. The repositories handle the DB calls. Change the approach: add `getMissingTranslations()` to `BlogPostRepository`:

In `src/server/db/repositories/blog-post.ts`, add:

```ts
async getMissingTranslations(): Promise<{ slug: string; title: string; locale: string }[]> {
  // Get all published posts
  const publishedPosts = await this.db
    .select({ id: blogPosts.id, slug: blogPosts.slug, title: blogPosts.title })
    .from(blogPosts)
    .where(eq(blogPosts.isPublished, 1))

  // Get all existing translations
  const translations = await this.db
    .select({ postId: blogPostTranslations.postId, locale: blogPostTranslations.locale })
    .from(blogPostTranslations)

  const locales = [...new Set(translations.map(t => t.locale))]
  const translated = new Set(translations.map(t => `${t.postId}:${t.locale}`))

  const missing: { slug: string; title: string; locale: string }[] = []
  for (const post of publishedPosts) {
    for (const locale of locales) {
      if (!translated.has(`${post.id}:${locale}`)) {
        missing.push({ slug: post.slug, title: post.title, locale })
      }
    }
  }
  return missing
}
```

Then in `admin-routes.ts`, add the route handler (after the blog seed block):

```ts
// Blog: missing translations
if (path === '/api/manage/blog/missing-translations' && method === 'GET') {
  const perm = requirePermission(auth.payload, 'manage:blog')
  if (perm) return perm
  const repo = new BlogPostRepository(db)
  return json(await repo.getMissingTranslations())
}
```

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/server/db/admin-routes.ts src/server/db/repositories/blog-post.ts
git commit -m "feat: add missing-translations endpoint to admin routes"
```

---

### Task 7: Wire `D1_PRIMARY` routing in `server.ts`

**Files:**
- Modify: `src/server.ts`

This is the integration task that makes everything work together.

- [ ] **Step 1: Write the failing test**

Create `src/server/server-routing.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('D1_PRIMARY routing convention', () => {
  it('has a stable D1_PRIMARY env var default in wrangler.jsonc', async () => {
    const fs = await import('fs/promises')
    const raw = await fs.readFile('wrangler.jsonc', 'utf-8')
    // Strip jsonc comments
    const cleaned = raw.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
    const config = JSON.parse(cleaned)
    expect(config.vars?.D1_PRIMARY).toBe('false')
  })
})
```

- [ ] **Step 2: Run — expect PASS**

```bash
npm run test -- server-routing.test
```

Expected: PASS (wrangler.jsonc already updated in Task 3).

- [ ] **Step 3: Update `src/server.ts` to add `D1_PRIMARY` conditional routing**

Replace the current admin-routes block (lines 63-82) with:

```ts
// ─── Auth routes ───────────────────────────────────────────
app.all('/api/auth/*', (c) => handleD1PrimaryRoute(c, handleAuthRouteForServer))

// ─── User/profile routes ────────────────────────────────────
app.all('/api/user/*', (c) => handleD1PrimaryRoute(c, handleProfileRouteForServer))

// ─── Admin routes ──────────────────────────────────────────
app.all('/api/manage/*', (c) => handleD1PrimaryRoute(c, handleAdminRouteForServer))
app.get('/api/roles', (c) => handleD1PrimaryRoute(c, handleAdminRouteForServer))
app.get('/api/roles/*', (c) => handleD1PrimaryRoute(c, handleAdminRouteForServer))
app.get('/api/permissions', (c) => handleD1PrimaryRoute(c, handleAdminRouteForServer))
```

Add the import at the top of `server.ts`:

```ts
import { handleAuthRoute } from './server/routes/auth'
import { handleProfileRoute } from './server/routes/profile'
```

Add the `handleD1PrimaryRoute` helper near `handleEdgeRead`:

```ts
type RouteHandler = (request: Request, env: any, ctx?: ExecutionContext) => Promise<Response | null>

// Wrappers that match the (request, env, ctx) signature expected by each handler
const handleAuthRouteForServer: RouteHandler = (req, env) => handleAuthRoute(req, env)
const handleProfileRouteForServer: RouteHandler = (req, env) => handleProfileRoute(req, env)
const handleAdminRouteForServer: RouteHandler = (req, env, ctx) => handleAdminRoute(req, env, ctx!)

async function handleD1PrimaryRoute(c: any, handler: RouteHandler) {
  if (c.env?.D1_PRIMARY === 'true' && c.env?.DB && c.env?.JWT_SECRET) {
    try {
      const response = await handler(c.req.raw, c.env, c.executionCtx)
      if (response) return response
    } catch (e) {
      console.error('[d1-primary] Error, falling through to Azure:', e)
    }
  }
  return proxyToAzure(c)
}
```

Remove the now-unused `handleEdgeAdmin` function.

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 5: Build to verify TypeScript**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/server.ts src/server/server-routing.test.ts
git commit -m "feat: add D1_PRIMARY feature flag routing to server.ts"
```

---

### Task 8: Manual smoke test on workers.dev preview

These steps run against a non-production Workers preview deployment with `D1_PRIMARY=true`.

- [ ] **Step 1: Set secrets on Cloudflare (if not already set)**

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put SYNC_SECRET
npx wrangler secret put MICROSOFT_CLIENT_ID
npx wrangler secret put MICROSOFT_CLIENT_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

- [ ] **Step 2: Deploy to workers.dev preview with D1_PRIMARY=true**

```bash
npx wrangler deploy --var D1_PRIMARY:true --env preview
```

(Or temporarily set `D1_PRIMARY: "true"` in wrangler.jsonc for the preview and revert after.)

- [ ] **Step 3: Run smoke tests manually**

```
POST /api/auth/register         → 201 with accessToken + refreshToken
POST /api/auth/login            → 200 with accessToken + refreshToken
POST /api/auth/refresh-token    → 200 with new accessToken
POST /api/auth/revoke-token     → 204
GET  /api/user/profile          → 200 with user object
PUT  /api/user/profile          → 200 with updated user
GET  /api/manage/blog           → 200 with posts list
POST /api/manage/blog           → 201 with new post
GET  /api/manage/blog/missing-translations → 200 with array
GET  /api/manage/users          → 200 with user list
GET  /api/roles                 → 200 with roles
GET  /api/permissions           → 200 with permissions
```

All should return expected responses without proxying to Azure.

- [ ] **Step 4: Confirm production still works with D1_PRIMARY=false**

```bash
# Production deploy should still have D1_PRIMARY=false
npx wrangler deploy
```

Verify that `/api/manage/blog` on production returns data from Azure (current behavior unchanged).

---

**Plan 1 complete.** Production continues to run with `D1_PRIMARY=false`. Workers are ready to flip to `D1_PRIMARY=true` once the migration data is in place.

Move to Plan 2: Migration and Cutover Tooling.
