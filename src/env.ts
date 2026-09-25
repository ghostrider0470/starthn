/**
 * Client environment variables (VITE_*), read from import.meta.env.
 *
 * Deliberately a few lines of hand-written checks instead of a schema library:
 * this module is imported by code in the client entry chunk (feature flags,
 * image URLs), and @t3-oss/env-core + zod added ~55 KB of minified JS to every
 * page. Same rules as before: an empty string counts as unset, and a variable
 * that must be a URL fails loudly at startup when it is not one.
 */

export type ClientEnv = {
  VITE_APP_TITLE?: string
  VITE_API_URL?: string
  VITE_MICROSOFT_CLIENT_ID?: string
  VITE_GOOGLE_CLIENT_ID?: string
  VITE_LOCALES_CDN?: string
  VITE_FEATURE_CASE_STUDIES?: string
  VITE_FEATURE_TECHNICAL_RESOURCES?: string
  VITE_FEATURE_INNOVATION_LAB?: string
  VITE_FEATURE_CHAT?: string
  VITE_AZURE_BLOB_ORIGIN?: string
}

const STRING_KEYS = [
  'VITE_APP_TITLE',
  'VITE_API_URL',
  'VITE_MICROSOFT_CLIENT_ID',
  'VITE_GOOGLE_CLIENT_ID',
  'VITE_LOCALES_CDN',
  'VITE_FEATURE_CASE_STUDIES',
  'VITE_FEATURE_TECHNICAL_RESOURCES',
  'VITE_FEATURE_INNOVATION_LAB',
  'VITE_FEATURE_CHAT',
] as const satisfies ReadonlyArray<keyof ClientEnv>

const URL_KEYS = ['VITE_AZURE_BLOB_ORIGIN'] as const satisfies ReadonlyArray<
  keyof ClientEnv
>

/** A non-empty string, else undefined (an empty .env entry means unset). */
function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

/** URL.canParse is too new for some supported browsers (Safari < 17). */
function isUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

/** Validates and picks the known client variables from `source`. */
export function readClientEnv(source: Record<string, unknown>): ClientEnv {
  const env: ClientEnv = {}
  for (const key of STRING_KEYS) {
    const value = optionalString(source[key])
    if (value !== undefined) env[key] = value
  }
  for (const key of URL_KEYS) {
    const value = optionalString(source[key])
    if (value === undefined) continue
    if (!isUrl(value)) {
      throw new Error(`Invalid environment variable ${key}: not a URL`)
    }
    env[key] = value
  }
  return env
}

export const env: ClientEnv = readClientEnv(
  import.meta.env as unknown as Record<string, unknown>,
)
