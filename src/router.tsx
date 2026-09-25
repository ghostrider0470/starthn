import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { I18nextProvider } from 'react-i18next'
import { routeTree } from './routeTree.gen'
import i18n from './i18n'
import { DEFAULT_LOCALE } from './lib/i18n-utils'

export function getRouter() {
  const queryClient = new QueryClient()

  // TanStack Start calls getRouter() once per SSR request. The module-level
  // i18next instance is shared by every concurrent request in the Worker, so
  // switching its language per request leaks one request's locale into
  // another's render (and into the edge cache). Each SSR request gets its own
  // clone instead: it shares the resource store and services with the
  // singleton but keeps its own language. Clones skip initReactI18next, so the
  // clone is handed to React explicitly through the I18nextProvider in `Wrap`.
  // On the client there is only ever one request, so the singleton is used.
  const i18nInstance =
    typeof window === 'undefined' ? i18n.cloneInstance({ initAsync: false }) : i18n

  const router = createRouter({
    routeTree,
    context: {
      queryClient,
      i18n: i18nInstance,
    },
    // Wrap (not a provider inside RootComponent): RootComponent itself calls
    // useTranslation, and notFoundComponent/errorComponent render in its place.
    Wrap: ({ children }) => (
      <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>
    ),
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultStructuralSharing: true,
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: () => (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    ),
    defaultPendingMinMs: 200,
    // Dehydrate i18n translations on the server so the client has them
    // before React renders — eliminates translation key flash. Read from this
    // request's clone, never from the shared singleton.
    dehydrate: () => {
      const lang = i18nInstance.language ?? DEFAULT_LOCALE
      return {
        i18nStore: { [lang]: i18nInstance.store?.data?.[lang] ?? {} },
        i18nLang: lang,
      }
    },
    hydrate: (dehydrated) => {
      const { i18nStore, i18nLang } = dehydrated
      if (i18nStore) {
        const langData = i18nStore[i18nLang]
        if (langData) {
          for (const [ns, resources] of Object.entries(langData)) {
            i18n.addResourceBundle(i18nLang, ns, resources as Record<string, unknown>, true, true)
          }
        }
      }
      if (i18nLang && i18n.language !== i18nLang) {
        i18n.changeLanguage(i18nLang)
      }
    },
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
