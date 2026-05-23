import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getLocaleFromPath,
  isValidLocale,
} from '@/lib/i18n-utils'

export const I18N_NAMESPACES = ['common', 'seo', 'landing', 'auth', 'blog', 'pages', 'services', 'innovation-lab']

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

/**
 * Load translations for SSR. Called from route beforeLoad during rendering.
 * Production: reads via Worker ASSETS binding.
 * Dev: reads via Vite import.meta.glob (workerd's node:fs is broken on Windows).
 * Client-side this is a no-op — translations arrive via router dehydration.
 */
export async function loadTranslationsForSSR(locale: string): Promise<void> {
  if (typeof window !== 'undefined') return
  // In dev, always reload from disk so JSON edits pick up without a server restart.
  // In prod the Worker's module/ASSETS layer is already the cache — re-reading is cheap
  // but the hasResourceBundle short-circuit saves a few cycles per request.
  if (!import.meta.env.DEV && i18n.hasResourceBundle(locale, 'common')) {
    if (i18n.language !== locale) await i18n.changeLanguage(locale)
    return
  }

  const { getAssets } = await import('./server/assets-context')
  const assets = getAssets()

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
          // Dev: fetch from Vite's static server — always reads fresh from disk,
          // bypassing the import.meta.glob module cache in the miniflare worker.
          try {
            const res = await fetch(`http://localhost:3000/locales/${locale}/${ns}.json`)
            if (res.ok) {
              i18n.addResourceBundle(locale, ns, await res.json(), true, true)
            }
          } catch {
            // namespace may not exist for this locale
          }
        }
      } catch (e) {
        console.error(`[i18n] Error loading ${locale}/${ns}:`, e)
      }
    }),
  )

  if (i18n.language !== locale) {
    await i18n.changeLanguage(locale)
  }
}

export default i18n
