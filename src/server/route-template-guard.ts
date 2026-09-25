import { DEFAULT_LOCALE, withLocalePath } from '@/lib/i18n-utils'

/**
 * Leaked route-template URLs like "/{-$locale}/terms" (a TanStack route id
 * rendered as an href). The SSR router 307s them to themselves with "$"
 * re-encoded, an infinite loop Google reports as "Redirect error".
 *
 * Returns the real page to 301 to, or null if the path isn't a template URL.
 */
const TEMPLATE_SEGMENT = /^\{-?\$[^}/]*\}$/

export function resolveRouteTemplatePath(pathname: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }

  const segments = decoded.split('/').filter(Boolean)
  if (!segments.some((segment) => TEMPLATE_SEGMENT.test(segment))) return null

  const realPath =
    `/${segments.filter((segment) => !TEMPLATE_SEGMENT.test(segment)).join('/')}`
  return withLocalePath(realPath, DEFAULT_LOCALE)
}
