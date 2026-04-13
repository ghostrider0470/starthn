import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import i18n from './i18n'

export function getRouter() {
  const queryClient = new QueryClient()

  const router = createRouter({
    routeTree,
    context: {
      queryClient,
    },
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
    // before React renders — eliminates translation key flash.
    dehydrate: () => {
      const lang = i18n.language ?? 'en-US'
      return {
        i18nStore: { [lang]: i18n.store?.data?.[lang] ?? {} },
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
