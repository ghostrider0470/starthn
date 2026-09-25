/**
 * Small hand-written parsers for route `validateSearch`. Route options are
 * part of the client entry chunk, so a schema library here (zod: ~54 KB of
 * minified JS) would ship on every page. TanStack Router has already
 * JSON-parsed each query value, so "?page=2" arrives as the number 2 and
 * "?q=2024" as 2024.
 */

type SearchInput = Record<string, unknown>

/** A string, or a number/boolean written back as text; anything else: undefined. */
export function searchString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return String(value)
  return undefined
}

/** A whole number >= 1 (from a number or a numeric string), else undefined. */
export function searchPositiveInt(value: unknown): number | undefined {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN
  return Number.isInteger(n) && n >= 1 ? n : undefined
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** A plausible e-mail address, else undefined. */
export function searchEmail(value: unknown): string | undefined {
  const text = searchString(value)?.trim()
  return text && EMAIL.test(text) ? text : undefined
}

/** `values` without its undefined entries, so they never reach the URL. */
function compact<T extends Record<string, unknown>>(values: T): T {
  return Object.fromEntries(
    Object.entries(values).filter(([, v]) => v !== undefined),
  ) as T
}

export type BlogSearch = {
  q?: string
  category?: string
  subcategory?: string
  tag?: string
  page?: number
  pageSize?: number
}

/** /blog filters. An unusable value is dropped, never an error page. */
export function parseBlogSearch(search: SearchInput): BlogSearch {
  return compact({
    q: searchString(search.q),
    category: searchString(search.category),
    subcategory: searchString(search.subcategory),
    tag: searchString(search.tag),
    page: searchPositiveInt(search.page),
    pageSize: searchPositiveInt(search.pageSize),
  })
}

export type ConfirmEmailSearch = { userId?: string; token?: string }

/** /confirm-email link parameters; the page reports missing ones. */
export function parseConfirmEmailSearch(
  search: SearchInput,
): ConfirmEmailSearch {
  return compact({
    userId: searchString(search.userId),
    token: searchString(search.token),
  })
}

export type OAuthCallbackSearch = {
  code?: string
  state?: string
  error?: string
  error_description?: string
}

/** OAuth provider redirect parameters. */
export function parseOAuthCallbackSearch(
  search: SearchInput,
): OAuthCallbackSearch {
  return compact({
    code: searchString(search.code),
    state: searchString(search.state),
    error: searchString(search.error),
    error_description: searchString(search.error_description),
  })
}

export type ResetPasswordSearch = { token: string; email?: string }

/**
 * /reset-password link parameters. A missing token is '' (the page sends the
 * visitor back to "forgot password"); an invalid e-mail is dropped.
 */
export function parseResetPasswordSearch(
  search: SearchInput,
): ResetPasswordSearch {
  return compact({
    token: searchString(search.token) ?? '',
    email: searchEmail(search.email),
  })
}
