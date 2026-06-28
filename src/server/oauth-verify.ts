/**
 * Cryptographic verification of OAuth/OIDC ID tokens against the provider's
 * JWKS using the Web Crypto API (RSASSA-PKCS1-v1_5 / SHA-256, i.e. RS256).
 *
 * SECURITY: the frontend sends ONLY an idToken to /api/auth/external-login.
 * That token MUST be verified cryptographically — never trusted via unsigned
 * base64 decode — or an attacker could forge any email (including admin emails).
 */

export interface VerifiedProfile {
  email: string
  firstName: string
  lastName: string
}

interface VerifyEnv {
  MICROSOFT_TENANT_ID?: string
  MICROSOFT_CLIENT_ID?: string
  GOOGLE_CLIENT_ID?: string
}

type Provider = 'microsoft' | 'google'

interface Jwk extends JsonWebKey {
  kid?: string
  alg?: string
}

// Small optional in-module JWKS cache keyed by url with short TTL.
const JWKS_TTL_MS = 5 * 60 * 1000
const jwksCache = new Map<string, { keys: Jwk[]; fetchedAt: number }>()

function base64UrlToBytes(segment: string): Uint8Array {
  const b64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function decodeJsonSegment<T>(segment: string): T | null {
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(segment))
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

function jwksUrl(provider: Provider, env: VerifyEnv): string {
  if (provider === 'microsoft') {
    const tenant = env.MICROSOFT_TENANT_ID?.trim() || 'common'
    return `https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`
  }
  return 'https://www.googleapis.com/oauth2/v3/certs'
}

async function fetchJwks(url: string): Promise<Jwk[]> {
  const cached = jwksCache.get(url)
  if (cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) {
    return cached.keys
  }
  const resp = await fetch(url)
  if (!resp.ok) return []
  const data = (await resp.json()) as { keys?: Jwk[] }
  const keys = Array.isArray(data.keys) ? data.keys : []
  jwksCache.set(url, { keys, fetchedAt: Date.now() })
  return keys
}

function isAudienceValid(aud: unknown, clientId: string): boolean {
  if (typeof aud === 'string') return aud === clientId
  if (Array.isArray(aud)) return aud.includes(clientId)
  return false
}

function isIssuerValid(provider: Provider, iss: unknown): boolean {
  if (typeof iss !== 'string') return false
  if (provider === 'google') {
    return iss === 'https://accounts.google.com' || iss === 'accounts.google.com'
  }
  // microsoft: v2.0 endpoint or legacy sts.windows.net, with a GUID tenant.
  return (
    /^https:\/\/login\.microsoftonline\.com\/[0-9a-fA-F-]{36}\/v2\.0$/.test(iss) ||
    /^https:\/\/sts\.windows\.net\/[0-9a-fA-F-]{36}\/$/.test(iss)
  )
}

function nonEmptyString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function splitDisplayName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') }
}

export async function verifyOidcIdToken(
  provider: Provider,
  idToken: string,
  env: VerifyEnv,
): Promise<VerifiedProfile | null> {
  try {
    const parts = idToken.split('.')
    if (parts.length !== 3) return null
    const [headerB64, payloadB64, signatureB64] = parts

    const header = decodeJsonSegment<{ alg?: string; kid?: string }>(headerB64)
    if (!header || header.alg !== 'RS256' || !header.kid) return null

    const payload = decodeJsonSegment<Record<string, unknown>>(payloadB64)
    if (!payload) return null

    // The client id we MUST validate aud against. If unset, we cannot verify.
    const clientId =
      provider === 'microsoft' ? env.MICROSOFT_CLIENT_ID : env.GOOGLE_CLIENT_ID
    if (!clientId) return null

    // --- signature verification ---
    const keys = await fetchJwks(jwksUrl(provider, env))
    const jwk = keys.find((k) => k.kid === header.kid)
    if (!jwk) return null

    let cryptoKey: CryptoKey
    try {
      cryptoKey = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      )
    } catch {
      return null
    }

    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    const signature = base64UrlToBytes(signatureB64)
    const valid = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      cryptoKey,
      signature as unknown as ArrayBuffer,
      data,
    )
    if (!valid) return null

    // --- claim validation ---
    const exp = payload.exp
    if (typeof exp !== 'number' || exp <= Math.floor(Date.now() / 1000)) return null

    if (!isAudienceValid(payload.aud, clientId)) return null
    if (!isIssuerValid(provider, payload.iss)) return null

    if (provider === 'microsoft') {
      const tenant = env.MICROSOFT_TENANT_ID?.trim()
      if (tenant && tenant !== 'common' && tenant !== 'organizations') {
        if (payload.tid !== tenant) return null
      }
    }

    if (payload.email_verified === false) return null

    // --- profile extraction ---
    const email = nonEmptyString(
      payload.email ?? payload.preferred_username ?? payload.upn ?? payload.unique_name,
    )
    if (!email) return null

    const fallback = splitDisplayName(nonEmptyString(payload.name))
    const firstName = nonEmptyString(payload.given_name) || fallback.firstName
    const lastName = nonEmptyString(payload.family_name) || fallback.lastName

    return { email: email.toLowerCase(), firstName, lastName }
  } catch {
    return null
  }
}
