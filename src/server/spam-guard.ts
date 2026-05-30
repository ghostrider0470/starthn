/**
 * Detection for the spam URLs injected by a prior site compromise.
 *
 * These paths must be served a 410 Gone (see src/server.ts) so Google deindexes
 * them. The matchers are deliberately narrow: they target the spam URL *shape*
 * and must never match a legitimate route (legit pages are word slugs, never
 * letter+digit IDs, and the site has no /items/ paths).
 */

const ITEMS_PATH = /(^|\/)items\//i

/**
 * Bare injected IDs: an uppercase letter followed by 6+ digits as the final
 * path segment, optionally locale-prefixed.
 * Matches: /en-US/B471837416, /bs/Y156399317, /zh-Hans/X1234567, /B471837416
 */
const INJECTED_ID = /^(?:\/[A-Za-z]{2,3}(?:-[A-Za-z]{2,4})?)?\/[A-Z]\d{6,}\/?$/

export function isHackSpam(pathname: string): boolean {
  return ITEMS_PATH.test(pathname) || INJECTED_ID.test(pathname)
}
