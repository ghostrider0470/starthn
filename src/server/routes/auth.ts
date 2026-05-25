import bcrypt from 'bcryptjs'
import { signJwt, loadUserPermissions, verifyJwt } from '../auth'
import { createDb, UserRepository, RoleRepository } from '../db'

interface AuthEnv {
  DB: D1Database
  JWT_SECRET: string
  ADMIN_EMAILS?: string
  MICROSOFT_CLIENT_ID?: string
  MICROSOFT_CLIENT_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
}

interface UserRow {
  id: string
  email: string
  password_hash: string | null
  first_name: string | null
  last_name: string | null
  is_active: number
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

async function promoteIfAdminEmail(
  email: string,
  userId: string,
  adminEmails: string,
  db: ReturnType<typeof createDb>,
  userRepo: UserRepository,
): Promise<string[]> {
  const list = adminEmails.split(',').map((e) => e.trim()).filter(Boolean)
  if (!list.includes(email)) return []
  const roleRepo = new RoleRepository(db)
  const adminRole = await roleRepo.getByName('MasterAdmin')
  if (!adminRole) return []
  await userRepo.updateRoles(userId, ['MasterAdmin'])
  return ['MasterAdmin']
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
      const roleNames = await promoteIfAdminEmail(body.email, userId, env.ADMIN_EMAILS ?? '', db, userRepo)

      return buildAuthResponse(
        userId,
        body.email,
        body.firstName,
        body.lastName,
        roleNames,
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
      const row = await env.DB.prepare(
        `SELECT user_id FROM refresh_tokens WHERE token_hash = ? AND expires_at > datetime('now')`,
      )
        .bind(tokenHash)
        .first<{ user_id: string }>()
      if (!row) return json({ error: 'Invalid or expired refresh token' }, 401)

      await env.DB.prepare(
        'DELETE FROM refresh_tokens WHERE user_id = ?',
      )
        .bind(row.user_id)
        .run()

      const user = await env.DB.prepare(
        'SELECT id, email, first_name, last_name, is_active FROM users WHERE id = ?',
      )
        .bind(row.user_id)
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
      const authHeader = request.headers.get('Authorization')
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
      }
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

      if (body.provider === 'google') {
        const params = new URLSearchParams({
          client_id: env.GOOGLE_CLIENT_ID ?? '',
          client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
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

    // External login (OAuth access_token verified via userinfo endpoint)
    if (path === '/api/auth/external-login' && method === 'POST') {
      const body = (await request.json()) as { provider?: string; accessToken?: string }
      if (!body.provider || !body.accessToken) return json({ error: 'Missing provider or accessToken' }, 400)

      let email: string
      let firstName: string
      let lastName: string

      if (body.provider === 'microsoft') {
        const resp = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${body.accessToken}` },
        })
        if (!resp.ok) return json({ error: 'Invalid Microsoft access token' }, 401)
        const profile = await resp.json() as {
          mail?: string; userPrincipalName?: string;
          givenName?: string; surname?: string; displayName?: string
        }
        email = profile.mail || profile.userPrincipalName || ''
        firstName = profile.givenName || (profile.displayName || '').split(' ')[0] || ''
        lastName = profile.surname || (profile.displayName || '').split(' ').slice(1).join(' ') || ''
      } else if (body.provider === 'google') {
        const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${body.accessToken}` },
        })
        if (!resp.ok) return json({ error: 'Invalid Google access token' }, 401)
        const profile = await resp.json() as {
          email?: string; given_name?: string; family_name?: string; name?: string
        }
        email = profile.email || ''
        firstName = profile.given_name || (profile.name || '').split(' ')[0] || ''
        lastName = profile.family_name || (profile.name || '').split(' ').slice(1).join(' ') || ''
      } else {
        return json({ error: 'Unsupported provider' }, 400)
      }

      if (!email) return json({ error: 'Could not determine email from provider' }, 400)

      const db = createDb(env.DB)
      const userRepo = new UserRepository(db)
      let user = await userRepo.getByEmail(email)
      if (user && !user.isActive) return json({ error: 'Account disabled' }, 403)

      if (!user) {
        const newUser = await userRepo.create({ email, firstName, lastName })
        await promoteIfAdminEmail(email, newUser.id, env.ADMIN_EMAILS ?? '', db, userRepo)
        user = await userRepo.getById(newUser.id) as typeof user
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
