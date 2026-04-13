/**
 * JWT verification for Cloudflare Workers using Web Crypto API.
 * Verifies HS256 tokens issued by the Azure Functions backend.
 * Token ISSUANCE stays on Azure — Workers only VERIFY.
 */

export interface JwtPayload {
  sub: string          // user id (nameid claim)
  email: string
  given_name?: string
  family_name?: string
  role?: string | string[]
  permission?: string | string[]
  exp: number
  iss?: string
  aud?: string
}

export interface AuthResult {
  payload: JwtPayload
  token: string
}

function base64UrlDecode(str: string): Uint8Array {
  // base64url → base64
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function importKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
}

/** Verify an HS256 JWT and return the decoded payload, or null if invalid. */
export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [headerB64, payloadB64, signatureB64] = parts

  try {
    // Verify signature
    const key = await importKey(secret)
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    const signature = base64UrlDecode(signatureB64)

    // Workers runtime types differ from lib.dom — cast is safe at runtime
    const valid = await crypto.subtle.verify('HMAC', key, signature as unknown as ArrayBuffer, data)
    if (!valid) return null

    // Decode payload
    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64))
    const payload = JSON.parse(payloadJson) as JwtPayload

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null

    // Normalize nameid → sub
    if (!payload.sub && (payload as any).nameid) {
      payload.sub = (payload as any).nameid
    }

    return payload
  } catch {
    return null
  }
}

/** Hash a raw API key with SHA-256, matching the Azure backend's HashKey(). */
async function hashApiKey(rawKey: string): Promise<string> {
  const data = new TextEncoder().encode(rawKey)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Validate an API key (ht_ prefix) against D1. Returns AuthResult or null. */
export async function validateApiKey(
  token: string,
  db: D1Database,
): Promise<AuthResult | null> {
  const keyHash = await hashApiKey(token)

  const row = await db
    .prepare(
      `SELECT ak.user_id, ak.expires_at, u.email, u.first_name, u.last_name, u.slug
       FROM api_keys ak
       JOIN users u ON u.id = ak.user_id
       WHERE ak.key_hash = ? AND u.is_active = 1`,
    )
    .bind(keyHash)
    .first<{
      user_id: string
      expires_at: string | null
      email: string
      first_name: string
      last_name: string
      slug: string | null
    }>()

  if (!row) return null

  // Check expiration
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null

  // Load user roles
  const roles = await db
    .prepare(
      `SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ?`,
    )
    .bind(row.user_id)
    .all<{ name: string }>()

  const roleNames = roles.results?.map((r) => r.name) ?? []

  // Update last_used_at (fire-and-forget)
  db.prepare(`UPDATE api_keys SET last_used_at = datetime('now') WHERE key_hash = ?`)
    .bind(keyHash)
    .run()
    .catch(() => {})

  const payload: JwtPayload = {
    sub: row.user_id,
    email: row.email,
    given_name: row.first_name,
    family_name: row.last_name,
    role: roleNames,
    exp: row.expires_at
      ? Math.floor(new Date(row.expires_at).getTime() / 1000)
      : Math.floor(Date.now() / 1000) + 86400,
  }

  return { payload, token }
}

/** Extract and verify JWT or API key from request. Returns null if no valid token. */
export async function extractAuth(
  request: Request,
  jwtSecret: string,
  db?: D1Database,
): Promise<AuthResult | null> {
  const authHeader = request.headers.get('X-Authorization') || request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)

  // API key (ht_ prefix) — validate against D1
  if (token.startsWith('ht_') && db) {
    return validateApiKey(token, db)
  }

  // JWT
  const payload = await verifyJwt(token, jwtSecret)
  if (!payload) return null

  return { payload, token }
}

/** Require authentication — returns AuthResult or a 401 Response. */
export async function requireAuth(request: Request, jwtSecret: string, db?: D1Database): Promise<AuthResult | Response> {
  const auth = await extractAuth(request, jwtSecret, db)
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return auth
}

/** Check if the JWT payload includes a specific permission. */
export function hasPermission(payload: JwtPayload, permission: string): boolean {
  const perms = Array.isArray(payload.permission)
    ? payload.permission
    : payload.permission ? [payload.permission] : []
  return perms.includes(permission)
}

/** Check if the JWT payload includes any of the given roles. */
export function hasRole(payload: JwtPayload, ...roles: string[]): boolean {
  const userRoles = Array.isArray(payload.role)
    ? payload.role
    : payload.role ? [payload.role] : []
  return roles.some(r => userRoles.includes(r))
}

/** Require a specific permission — returns void or a 403 Response. */
export function requirePermission(payload: JwtPayload, permission: string): Response | null {
  if (!hasPermission(payload, permission) && !hasRole(payload, 'MasterAdmin', 'superadmin')) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return null
}
