import bcrypt from 'bcryptjs'
import { signJwt, loadUserPermissions, verifyJwt } from '../auth'
import { createDb, UserRepository, RoleRepository } from '../db'
import { verifyOidcIdToken } from '../oauth-verify'

// Precomputed bcrypt hash of a fixed dummy password. Used to equalize login
// timing so a missing account / missing password_hash cannot be distinguished
// from a wrong password by response latency.
const DUMMY_BCRYPT_HASH =
  '$2b$10$FyHBduBXvdcvrSrSf.F4deSjIUO3IAGewDtCp17LxM/A93QMhbjay'

interface AuthEnv {
  DB: D1Database
  JWT_SECRET: string
  JWT_ISSUER?: string
  JWT_AUDIENCE?: string
  ADMIN_EMAILS?: string
  MICROSOFT_TENANT_ID?: string
  MICROSOFT_CLIENT_ID?: string
  MICROSOFT_CLIENT_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  // When 'true', blocks ALL new account creation — both /register and
  // first-time OAuth logins. Existing users can still sign in.
  DISABLE_REGISTRATION?: string
}

interface UserRow {
  id: string
  email: string
  password_hash: string | null
  first_name: string | null
  last_name: string | null
  is_active: number
}

type OAuthProviderKey = 'microsoft' | 'google'

interface ExternalProfile {
  email: string
  firstName: string
  lastName: string
}

const DEFAULT_MICROSOFT_TENANT_ID = 'aa722524-5f12-410b-b06c-d5a8d54b1ddf'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function generateRawToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256Hex(value: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function normalizeProvider(provider: string | undefined): OAuthProviderKey | null {
  const normalized = provider?.trim().toLowerCase()
  return normalized === 'microsoft' || normalized === 'google' ? normalized : null
}

async function getUserRoles(userId: string, db: D1Database): Promise<string[]> {
  const rows = await db
    .prepare(
      `SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ?`,
    )
    .bind(userId)
    .all<{ name: string }>()
  return (rows.results ?? []).map((r) => r.name)
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
      iss: env.JWT_ISSUER ?? 'starthn',
      aud: env.JWT_AUDIENCE ?? 'starthn-frontend',
    } as any,
    env.JWT_SECRET,
    expiresInSeconds,
  )

  const rawRefreshToken = generateRawToken()
  const tokenHash = await sha256Hex(rawRefreshToken)
  const refreshExpiry = new Date(
    Date.now() + 30 * 24 * 3600 * 1000,
  ).toISOString()
  const tokenId = crypto.randomUUID().replace(/-/g, '')
  const now = new Date().toISOString()

  await env.DB.prepare(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(tokenId, userId, tokenHash, refreshExpiry, now)
    .run()

  return json({
    message: 'Success',
    token: { accessToken, refreshToken: rawRefreshToken, expiresAt },
  })
}

async function masterAdminExists(db: D1Database): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.name = 'MasterAdmin' LIMIT 1`,
    )
    .first<{ 1: number }>()
  return row != null
}

async function syncAdminRole(
  email: string,
  userId: string,
  adminEmails: string,
  db: ReturnType<typeof createDb>,
  userRepo: UserRepository,
  rawDb: D1Database,
): Promise<void> {
  const list = adminEmails.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  const isAdmin = list.includes(email.toLowerCase())
  const currentUser = await userRepo.getById(userId)
  if (!currentUser) return
  const hasMasterAdmin = currentUser.roles.includes('MasterAdmin')
  if (isAdmin && !hasMasterAdmin) {
    // SECURITY: only auto-grant MasterAdmin during true first-time bootstrap.
    // Once any MasterAdmin exists, the role must be assigned by an existing
    // admin via the manage routes — never again from an unverified email list.
    //
    // Race note: this is a check-then-write. Concurrent registration of the
    // *same* email is serialised by the users.email UNIQUE constraint (second
    // attempt gets a 409 before it ever reaches syncAdminRole). With multiple
    // ADMIN_EMAILS the first registrant wins the MasterAdmin role; full
    // atomicity is intentionally not implemented — D1 has no advisory lock.
    if (await masterAdminExists(rawDb)) return
    await userRepo.updateRoles(userId, [...currentUser.roles, 'MasterAdmin'])
  } else if (!isAdmin && hasMasterAdmin) {
    await userRepo.updateRoles(userId, currentUser.roles.filter((r) => r !== 'MasterAdmin'))
  }
}

export async function handleAuthRoute(
  request: Request,
  env: AuthEnv,
): Promise<Response | null> {
  if (!env?.DB || !env?.JWT_SECRET) return null

  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  if (!path.startsWith('/api/auth/')) return null

  try {
    // Register
    if (path === '/api/auth/register' && method === 'POST') {
      if (env.DISABLE_REGISTRATION === 'true') {
        return json({ error: 'New registrations are currently disabled' }, 403)
      }
      const body = (await request.json()) as {
        email?: string
        password?: string
        firstName?: string
        lastName?: string
      }
      if (
        !body.email ||
        !body.password ||
        !body.firstName ||
        !body.lastName
      ) {
        return json({ error: 'Missing required fields' }, 400)
      }

      const existing = await env.DB.prepare(
        'SELECT id FROM users WHERE email = ?',
      )
        .bind(body.email)
        .first<{ id: string }>()
      if (existing) return json({ error: 'Email already registered' }, 409)

      const passwordHash = await bcrypt.hash(body.password, 10)
      const userId = crypto.randomUUID().replace(/-/g, '')
      const now = new Date().toISOString()

      await env.DB.prepare(
        'INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
      )
        .bind(
          userId,
          body.email,
          passwordHash,
          body.firstName,
          body.lastName,
          now,
          now,
        )
        .run()

      const db = createDb(env.DB)
      const userRepo = new UserRepository(db)
      await syncAdminRole(body.email, userId, env.ADMIN_EMAILS ?? '', db, userRepo, env.DB)
      const createdUser = await userRepo.getById(userId)

      return buildAuthResponse(
        userId,
        body.email,
        body.firstName,
        body.lastName,
        createdUser?.roles ?? [],
        env,
      )
    }

    // Login
    if (path === '/api/auth/login' && method === 'POST') {
      const body = (await request.json()) as {
        email?: string
        password?: string
      }
      if (!body.email || !body.password) {
        return json({ error: 'Missing credentials' }, 400)
      }

      const user = await env.DB.prepare(
        'SELECT id, email, password_hash, first_name, last_name, is_active FROM users WHERE email = ?',
      )
        .bind(body.email)
        .first<UserRow>()

      if (!user || !user.password_hash) {
        // Equalize timing: run a dummy bcrypt compare so response latency does
        // not reveal whether the account exists or has a usable password.
        await bcrypt.compare(body.password, DUMMY_BCRYPT_HASH)
        return json({ error: 'Invalid credentials' }, 401)
      }
      if (!user.is_active) {
        return json({ error: 'Account disabled' }, 403)
      }

      const valid = await bcrypt.compare(body.password, user.password_hash)
      if (!valid) return json({ error: 'Invalid credentials' }, 401)

      const roleNames = await getUserRoles(user.id, env.DB)

      return buildAuthResponse(
        user.id,
        user.email,
        user.first_name ?? '',
        user.last_name ?? '',
        roleNames,
        env,
      )
    }

    // Refresh token
    if (path === '/api/auth/refresh-token' && method === 'POST') {
      const body = (await request.json()) as { refreshToken?: string }
      if (!body.refreshToken) return json({ error: 'Missing refreshToken' }, 400)

      const tokenHash = await sha256Hex(body.refreshToken)
      // Atomically consume exactly the presented token. Compares ISO-to-ISO
      // (expires_at is stored as an ISO string), and RETURNING makes the
      // delete-and-read a single race-free operation, so token reuse fails.
      const nowIso = new Date().toISOString()
      const consumed = await env.DB.prepare(
        'DELETE FROM refresh_tokens WHERE token_hash = ? AND expires_at > ? RETURNING user_id',
      )
        .bind(tokenHash, nowIso)
        .first<{ user_id: string }>()
      if (!consumed) return json({ error: 'Invalid or expired refresh token' }, 401)

      const user = await env.DB.prepare(
        'SELECT id, email, first_name, last_name, is_active FROM users WHERE id = ?',
      )
        .bind(consumed.user_id)
        .first<Omit<UserRow, 'password_hash'>>()

      if (!user || !user.is_active) {
        return json({ error: 'User not found or disabled' }, 401)
      }

      const roleNames = await getUserRoles(user.id, env.DB)

      return buildAuthResponse(
        user.id,
        user.email,
        user.first_name ?? '',
        user.last_name ?? '',
        roleNames,
        env,
      )
    }

    // Revoke token
    if (path === '/api/auth/revoke-token' && method === 'POST') {
      const authHeader = request.headers.get('X-Authorization') || request.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Missing authorization' }, 401)

      const payload = await verifyJwt(authHeader.slice(7), env.JWT_SECRET)
      if (!payload?.sub) return json({ error: 'Invalid or expired token' }, 401)

      await env.DB.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').bind(payload.sub).run()
      return new Response(null, { status: 204 })
    }

    // Exchange code (OAuth)
    if (path === '/api/auth/exchange-code' && method === 'POST') {
      const body = (await request.json()) as {
        provider?: string
        code?: string
        redirectUri?: string
        codeVerifier?: string
      }
      if (!body.provider || !body.code || !body.redirectUri) {
        return json({ error: 'Missing provider, code, or redirectUri' }, 400)
      }

      const provider = normalizeProvider(body.provider)
      if (!provider) return json({ error: 'Unsupported provider' }, 400)

      if (provider === 'microsoft') {
        if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
          return json({ error: 'Microsoft OAuth is not configured' }, 500)
        }

        const tenantId = env.MICROSOFT_TENANT_ID?.trim() || DEFAULT_MICROSOFT_TENANT_ID
        const params = new URLSearchParams({
          client_id: env.MICROSOFT_CLIENT_ID,
          client_secret: env.MICROSOFT_CLIENT_SECRET,
          code: body.code,
          redirect_uri: body.redirectUri,
          grant_type: 'authorization_code',
          scope: 'openid profile email',
        })
        if (body.codeVerifier) params.set('code_verifier', body.codeVerifier)
        const resp = await fetch(
          `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
          {
            method: 'POST',
            body: params,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        )
        const data = await resp.json()
        return json(data, resp.ok ? 200 : resp.status)
      }

      if (provider === 'google') {
        if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
          return json({ error: 'Google OAuth is not configured' }, 500)
        }

        const params = new URLSearchParams({
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          code: body.code,
          redirect_uri: body.redirectUri,
          grant_type: 'authorization_code',
        })
        const resp = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          body: params,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
        const data = await resp.json()
        return json(data, resp.ok ? 200 : resp.status)
      }

      return json({ error: 'Unsupported provider' }, 400)
    }

    // External login — only JWKS-verified idToken is accepted.
    // The accessToken/userinfo path has been removed: the userinfo endpoint does
    // NOT validate token audience, so an access token issued to a different app
    // could be replayed to mint a starthn session. The frontend only ever sends
    // idToken (see ExternalAuthDto in src/services/auth.service.ts).
    if (path === '/api/auth/external-login' && method === 'POST') {
      const body = (await request.json()) as {
        provider?: string
        idToken?: string
      }
      if (!body.provider) return json({ error: 'Missing provider' }, 400)

      const externalProvider = normalizeProvider(body.provider)
      if (!externalProvider) return json({ error: 'Unsupported provider' }, 400)
      if (!body.idToken) {
        return json({ error: 'Missing idToken' }, 400)
      }

      const profile = await verifyOidcIdToken(externalProvider, body.idToken, env)

      if (!profile) return json({ error: 'Could not verify provider token' }, 401)

      const db = createDb(env.DB)
      const userRepo = new UserRepository(db)
      let user = await userRepo.getByEmail(profile.email)
      if (user && !user.isActive) return json({ error: 'Account disabled' }, 403)

      if (!user) {
        if (env.DISABLE_REGISTRATION === 'true') {
          return json({ error: 'New registrations are currently disabled' }, 403)
        }
        const newUser = await userRepo.create({
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
        })
        await syncAdminRole(profile.email, newUser.id, env.ADMIN_EMAILS ?? '', db, userRepo, env.DB)
        user = await userRepo.getById(newUser.id) as typeof user
      } else {
        await syncAdminRole(profile.email, user.id, env.ADMIN_EMAILS ?? '', db, userRepo, env.DB)
        user = await userRepo.getById(user.id) as typeof user
      }

      if (!user) return json({ error: 'Failed to create user' }, 500)

      return buildAuthResponse(user.id, user.email, user.firstName ?? '', user.lastName ?? '', user.roles, env)
    }
  } catch (err) {
    console.error('[auth-route]', err)
    return json({ error: 'Internal server error' }, 500)
  }

  return null
}
