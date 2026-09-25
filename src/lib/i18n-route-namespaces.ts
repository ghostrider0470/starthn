/**
 * Which translation resources a page needs in the browser.
 *
 * The server holds every namespace of the page locale, but the client only
 * gets what the router dehydrates into the HTML (see getRouter() in
 * src/router.tsx). Shipping the whole catalog made the hydration payload
 * 62-81% of every HTML response, auth and admin strings included, so each
 * public page gets only:
 *
 *   - BASE_RESOURCES: what the site shell renders on every page (navbar,
 *     footer, consent banner, error and offline fallbacks, the chat
 *     launcher's landing:chat strings) plus `seo`, which every route's head()
 *     reads, also during client navigation;
 *   - its own namespaces, or only the subtrees of `pages` it reads.
 *
 * A path that is not listed here (private and admin routes, auth pages,
 * unknown paths) gets every namespace, so a new route is never short of a
 * string by default. Client navigations fetch whatever the next page lacks
 * from /locales/<locale>/<ns>.json before it renders (see
 * ensureRouteResources() in src/i18n.ts).
 *
 * route-namespaces.test.ts walks each route's import graph and fails when a
 * page uses a namespace or `pages` subtree that its entry here does not cover.
 */
import { stripLocalePrefix } from '@/lib/i18n-utils'

export const I18N_NAMESPACES = [
  'common',
  'seo',
  'landing',
  'auth',
  'blog',
  'pages',
  'services',
] as const

export type I18nNamespace = (typeof I18N_NAMESPACES)[number]

/**
 * A whole namespace ("landing") or one subtree of it, as the namespace and a
 * dotted key path ("pages:contact"). The route map below only names whole
 * top-level subtrees: the client treats a subtree whose key is present as
 * complete (missingNamespaces), so a partial one would never be fetched.
 */
export type ResourceSpec = I18nNamespace | `${I18nNamespace}:${string}`

/**
 * Rendered on every page: the site shell, error/offline fallbacks, the chat
 * widget (mounted after load, see DeferredChatWidget) and head().
 */
export const BASE_RESOURCES: ReadonlyArray<ResourceSpec> = [
  'common',
  'seo',
  'pages:error',
  'landing:chat',
]

/** Every namespace in full: the default for any path not listed below. */
export const ALL_RESOURCES: ReadonlyArray<ResourceSpec> = I18N_NAMESPACES

/**
 * Locale-stripped, lowercase public paths → the resources their page reads
 * on top of BASE_RESOURCES. First match wins.
 */
const PUBLIC_ROUTE_RESOURCES: ReadonlyArray<
  readonly [RegExp, ReadonlyArray<ResourceSpec>]
> = [
  [/^\/$/, ['landing']],
  [/^\/services(?:\/[^/]+)?$/, ['services']],
  [/^\/about$/, ['pages:about']],
  [/^\/mission-vision$/, ['pages:missionVision']],
  [/^\/certificates$/, ['pages:certificates']],
  [/^\/contact$/, ['pages:contact']],
  [/^\/careers$/, ['pages:careers']],
  [/^\/education$/, ['pages:education']],
  [/^\/support$/, ['pages:support']],
  [/^\/blog$/, ['pages:blog', 'blog']],
  [/^\/blog\/[^/]+$/, ['pages:blogPost', 'pages:blog', 'blog']],
  // Legal pages render no translated body text (only shell + head()).
  [/^\/(?:privacy|terms)$/, []],
]

/**
 * The translation resources the page at `pathname` (with or without its
 * locale prefix) needs on the client.
 */
export function resourcesForPath(pathname: string): Array<ResourceSpec> {
  const path = stripLocalePrefix(pathname).toLowerCase()
  const entry = PUBLIC_ROUTE_RESOURCES.find(([pattern]) => pattern.test(path))
  if (!entry) return [...ALL_RESOURCES]
  return dedupeSpecs([...BASE_RESOURCES, ...entry[1]])
}

/** Splits "pages:contact" into ["pages", "contact"]; "landing" → ["landing", null]. */
export function parseSpec(spec: ResourceSpec): [string, string | null] {
  const colon = spec.indexOf(':')
  return colon === -1 ? [spec, null] : [spec.slice(0, colon), spec.slice(colon + 1)]
}

/** Drops duplicates and subtrees of namespaces that are included in full. */
export function dedupeSpecs(
  specs: ReadonlyArray<ResourceSpec>,
): Array<ResourceSpec> {
  const whole = new Set(
    specs.filter((spec) => parseSpec(spec)[1] === null).map((s) => parseSpec(s)[0]),
  )
  const seen = new Set<string>()
  return specs.filter((spec) => {
    if (seen.has(spec)) return false
    seen.add(spec)
    const [ns, path] = parseSpec(spec)
    return path === null || !whole.has(ns)
  })
}

type Bundle = Record<string, unknown>

function isPlainObject(value: unknown): value is Bundle {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getPath(bundle: unknown, path: string): unknown {
  let node: unknown = bundle
  for (const key of path.split('.')) {
    if (!isPlainObject(node)) return undefined
    node = node[key]
  }
  return node
}

function setPath(target: Bundle, path: string, value: unknown): void {
  const keys = path.split('.')
  let node = target
  for (const key of keys.slice(0, -1)) {
    if (!isPlainObject(node[key])) node[key] = {}
    node = node[key] as Bundle
  }
  node[keys[keys.length - 1]] = value
}

export interface SelectedResources {
  /** namespace → the (possibly partial) bundle to send to the client. */
  resources: Record<string, Bundle>
  /** Namespaces sent in full; the others hold only the listed subtrees. */
  complete: Array<string>
}

/**
 * Picks `specs` out of one locale's bundles (namespace → bundle). Values are
 * shared, not copied: the result is only serialized. A missing namespace or
 * subtree is skipped (the client then fetches it, see ensureRouteResources).
 */
export function selectResources(
  bundles: Record<string, unknown> | undefined,
  specs: ReadonlyArray<ResourceSpec>,
): SelectedResources {
  const resources: Record<string, Bundle> = {}
  const complete: Array<string> = []
  if (!bundles) return { resources, complete }

  for (const spec of dedupeSpecs(specs)) {
    const [ns, path] = parseSpec(spec)
    const bundle = bundles[ns]
    if (!isPlainObject(bundle)) continue
    if (path === null) {
      resources[ns] = bundle
      complete.push(ns)
      continue
    }
    const subtree = getPath(bundle, path)
    if (subtree === undefined) continue
    resources[ns] = resources[ns] ?? {}
    setPath(resources[ns], path, subtree)
  }
  return { resources, complete }
}

/**
 * The namespaces the client still has to fetch before rendering `specs`:
 * a whole namespace that is not complete, or a subtree that is absent from a
 * namespace that is not complete.
 */
export function missingNamespaces(
  specs: ReadonlyArray<ResourceSpec>,
  isComplete: (ns: string) => boolean,
  hasSubtree: (ns: string, path: string) => boolean,
): Array<string> {
  const missing = new Set<string>()
  for (const spec of specs) {
    const [ns, path] = parseSpec(spec)
    if (isComplete(ns)) continue
    if (path === null || !hasSubtree(ns, path)) missing.add(ns)
  }
  return [...missing]
}
