import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getLocaleFromPath,
  isValidLocale,
} from '@/lib/i18n-utils'

export const I18N_NAMESPACES = ['common', 'seo', 'landing', 'auth', 'blog', 'pages', 'services']

const isClient = typeof window !== 'undefined'
const languageFromPath = isClient ? getLocaleFromPath(window.location.pathname) : DEFAULT_LOCALE
const initialLanguage = isValidLocale(languageFromPath) ? languageFromPath : DEFAULT_LOCALE

// No fetch backend — translations come exclusively from SSR.
// Server: loadTranslationsForSSR() populates the store via addResourceBundle().
// Client: router hydrate() callback injects dehydrated translations before React renders.
i18n
  .use(initReactI18next)
  .init({
    lng: initialLanguage,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    nonExplicitSupportedLngs: false,
    load: 'currentOnly',
    defaultNS: 'common',
    ns: I18N_NAMESPACES,
    fallbackNS: 'common',
    resources: {},
    ...(!isClient && { initAsync: false }),
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
    react: { useSuspense: false },
  })

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
