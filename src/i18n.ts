import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { ResourceSpec } from '@/lib/i18n-route-namespaces'
import {
  I18N_NAMESPACES,
  missingNamespaces,
  resourcesForPath,
} from '@/lib/i18n-route-namespaces'
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getLocaleFromPath,
  isValidLocale,
} from '@/lib/i18n-utils'

export { I18N_NAMESPACES }

const isClient = typeof window !== 'undefined'
const languageFromPath = isClient ? getLocaleFromPath(window.location.pathname) : DEFAULT_LOCALE
const initialLanguage = isValidLocale(languageFromPath) ? languageFromPath : DEFAULT_LOCALE

// No i18next backend.
// Server: loadTranslationsForSSR() fills the store with every namespace.
// Client: the router's hydrate() callback adds the resources the page needs
// (dehydrated into the HTML, see src/lib/i18n-route-namespaces.ts) before
// React renders; ensureRouteResources() fetches what a client navigation
// lacks. As a last resort, a key missing from a namespace the client has only
// part of fetches the whole namespace (onMissingKey), and the store's 'added'
// event re-renders the components that read it.
i18n
  .use(initReactI18next)
  .init({
    lng: initialLanguage,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    nonExplicitSupportedLngs: false,
    load: 'currentOnly',
    defaultNS: 'common',
    ns: [...I18N_NAMESPACES],
    fallbackNS: 'common',
    resources: {},
    ...(!isClient && { initAsync: false }),
    ...(isClient && {
      saveMissing: true,
      saveMissingTo: 'current' as const,
      missingKeyHandler: (lngs: ReadonlyArray<string>, ns: string) =>
        onMissingKey(lngs, ns),
    }),
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
    react: { useSuspense: false, bindI18nStore: 'added' },
  })

// ─── Client: partial bundles ────────────────────────────────────────────────

/** locale → namespaces the client holds in full. */
const completeNamespaces = new Map<string, Set<string>>()
/** `${locale}|${ns}` → fetch in flight. */
const namespaceFetches = new Map<string, Promise<void>>()
/** `${locale}|${ns}` pairs a missing key already tried to fetch. */
const missingKeyFetches = new Set<string>()

const KNOWN_NAMESPACES: ReadonlySet<string> = new Set(I18N_NAMESPACES)

type StoreWithOptions = {
  addResourceBundle: (
    lng: string,
    ns: string,
    resources: unknown,
    deep: boolean,
    overwrite: boolean,
    options: { silent: boolean; skipCopy: boolean },
  ) => void
}

/**
 * Adds a bundle to the shared store. `silent` skips the store's 'added'
 * event, which re-renders every component that uses translations
 * (react.bindI18nStore): only needed when mounted components are waiting for
 * the strings. The bundle object is owned by the store afterwards.
 */
export function addBundle(
  locale: string,
  ns: string,
  bundle: unknown,
  { overwrite, silent }: { overwrite: boolean; silent: boolean },
): void {
  ;(i18n.store as unknown as StoreWithOptions).addResourceBundle(
    locale,
    ns,
    bundle,
    true,
    overwrite,
    { silent, skipCopy: true },
  )
}

/** Records that the client holds these namespaces of `locale` in full. */
export function markNamespacesComplete(
  locale: string,
  namespaces: Iterable<string>,
): void {
  const set = completeNamespaces.get(locale) ?? new Set<string>()
  for (const ns of namespaces) set.add(ns)
  completeNamespaces.set(locale, set)
}

export function isNamespaceComplete(locale: string, ns: string): boolean {
  return completeNamespaces.get(locale)?.has(ns) ?? false
}

/**
 * Fetches one whole namespace from /locales/<locale>/<ns>.json into the
 * store. Strings already present are kept (overwrite: false), so a bundle
 * the server filled from a fallback locale is never replaced. A failed
 * fetch is logged and retried by the next call.
 */
function fetchNamespace(
  locale: string,
  ns: string,
  silent: boolean,
): Promise<void> {
  const key = `${locale}|${ns}`
  const inFlight = namespaceFetches.get(key)
  if (inFlight) return inFlight
  const load = fetch(`/locales/${encodeURIComponent(locale)}/${ns}.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    })
    .then((bundle) => {
      addBundle(locale, ns, bundle, { overwrite: false, silent })
      markNamespacesComplete(locale, [ns])
    })
    .catch((error: unknown) => {
      console.error(`[i18n] Error fetching ${locale}/${ns}:`, error)
    })
    .finally(() => namespaceFetches.delete(key))
  namespaceFetches.set(key, load)
  return load
}

/**
 * Client only: makes sure `specs` are in the store for `locale`, fetching the
 * namespaces that are missing. Resolves once they are there (or failed).
 */
export async function ensureClientResources(
  locale: string,
  specs: ReadonlyArray<ResourceSpec>,
): Promise<void> {
  if (typeof window === 'undefined') return
  const missing = missingNamespaces(
    specs,
    (ns) => isNamespaceComplete(locale, ns),
    (ns, path) => i18n.getResource(locale, ns, path) !== undefined,
  )
  if (missing.length === 0) return
  // Silent: the page that needs these strings renders after this resolves.
  await Promise.all(missing.map((ns) => fetchNamespace(locale, ns, true)))
}

/**
 * Client only: loads what the page at `pathname` needs before it renders.
 * Called from the root route's beforeLoad, so it also runs for intent
 * preloads (hover), which warms the fetch before the click.
 */
export function ensureRouteResources(pathname: string): Promise<void> {
  return ensureClientResources(
    getLocaleFromPath(pathname),
    resourcesForPath(pathname),
  )
}

/**
 * A t() call missed a key. When the client has only part of that namespace,
 * fetch the rest once; the 'added' event then re-renders the caller. Only
 * for the page's own locale: the language switcher changes the language just
 * before it loads the new URL, which must not start fetches.
 */
function onMissingKey(lngs: ReadonlyArray<string>, ns: string): void {
  if (!KNOWN_NAMESPACES.has(ns)) return
  const pageLocale = getLocaleFromPath(window.location.pathname)
  for (const lng of lngs) {
    if (lng !== pageLocale || isNamespaceComplete(lng, ns)) continue
    const key = `${lng}|${ns}`
    if (missingKeyFetches.has(key)) continue
    missingKeyFetches.add(key)
    void fetchNamespace(lng, ns, false)
  }
}

// ─── Server ─────────────────────────────────────────────────────────────────

// Production loads in flight, keyed by locale. `common` is added before the
// other namespaces finish, so without this a concurrent request for the same
// locale would pass the hasResourceBundle short-circuit and render the
// still-missing namespaces as raw keys.
const ssrLoadsInFlight = new Map<string, Promise<void>>()

/**
 * Load translations for SSR. Called from route beforeLoad during rendering.
 * Production: reads via Worker ASSETS binding.
 * Dev: reads via Vite import.meta.glob (workerd's node:fs is broken on Windows).
 * Client-side this is a no-op — translations arrive via router dehydration.
 *
 * This only fills the resource store, which is shared by every per-request
 * clone (see getRouter()). It must NOT call changeLanguage: the singleton is
 * shared by concurrent SSR requests, so switching its language here would leak
 * one request's locale into another's render. Each request switches the
 * language on its own clone (router context `i18n`) instead.
 */
export async function loadTranslationsForSSR(locale: string): Promise<void> {
  if (typeof window !== 'undefined') return
  // In dev, always reload from disk so JSON edits pick up without a server restart.
  // In prod the Worker's module/ASSETS layer is already the cache — re-reading is cheap
  // but the hasResourceBundle short-circuit saves a few cycles per request.
  if (!import.meta.env.DEV) {
    const inFlight = ssrLoadsInFlight.get(locale)
    if (inFlight) return inFlight
    if (i18n.hasResourceBundle(locale, 'common')) return
  }

  const load = fillStoreForLocale(locale)
  if (!import.meta.env.DEV) {
    ssrLoadsInFlight.set(locale, load)
    void load.finally(() => ssrLoadsInFlight.delete(locale))
  }
  await load
}

async function fillStoreForLocale(locale: string): Promise<void> {
  const { getAssets } = await import('./server/assets-context')
  const assets = import.meta.env.DEV ? null : getAssets()

  await Promise.all(
    I18N_NAMESPACES.map(async (ns) => {
      try {
        if (assets) {
          // Production: Worker ASSETS binding
          const res = await assets.fetch(new Request(`https://assets/locales/${locale}/${ns}.json`))
          if (res.ok) {
            i18n.addResourceBundle(locale, ns, await res.json(), true, true)
          }
        } else {
          // Dev: import.meta.glob — works inside Workerd where fetch to localhost is unreliable.
          // Dynamically imported so the 137 locale chunks are never bundled into the prod build.
          const { localeModules } = await import('./i18n-dev-locales')
          const key = `/public/locales/${locale}/${ns}.json`
          const loader = localeModules[key]
          if (loader) {
            const mod = (await loader()) as { default?: Record<string, unknown> }
            i18n.addResourceBundle(locale, ns, mod.default ?? mod, true, true)
          }
        }
      } catch (e) {
        console.error(`[i18n] Error loading ${locale}/${ns}:`, e)
      }
    }),
  )
}

export default i18n
