import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { I18nextProvider } from 'react-i18next'
import { routeTree } from './routeTree.gen'
import i18n, { addBundle, markNamespacesComplete } from './i18n'
import { DEFAULT_LOCALE } from './lib/i18n-utils'
import { resourcesForPath, selectResources } from './lib/i18n-route-namespaces'

/** One namespace's translations as sent to the client (JSON values). */
type SerializedBundle = Record<string, NonNullable<unknown>>

interface DehydratedI18n {
  i18nStore?: Record<string, Record<string, SerializedBundle> | undefined>
  i18nLang: string
  /**
   * Namespaces of i18nStore sent in full; the others hold only some
   * subtrees. Absent in HTML rendered before partial dehydration, which
   * always carried every namespace in full.
   */
  i18nComplete?: Array<string>
}

export function getRouter() {
  const queryClient = new QueryClient()
  // The pathname being rendered, for dehydrate(). Read through this holder so
  // the router's type does not depend on itself.
  let currentPathname: () => string = () => '/'

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
    // Dehydrate the translations this page renders so the client has them
    // before React hydrates (no raw keys, no flash), and nothing else: the
    // whole catalog, admin and auth strings included, used to be 62-81% of
    // every HTML response. Which namespaces and `pages` subtrees a path gets
    // is listed in src/lib/i18n-route-namespaces.ts; client navigations fetch
    // the rest (root route beforeLoad). Read from this request's clone,
    // never from the shared singleton.
    dehydrate: (): DehydratedI18n => {
      const lang = i18nInstance.language ?? DEFAULT_LOCALE
      const { resources, complete } = selectResources(
        i18nInstance.store.data[lang],
        resourcesForPath(currentPathname()),
      )
      return {
        i18nStore: { [lang]: resources as Record<string, SerializedBundle> },
        i18nLang: lang,
        i18nComplete: complete,
      }
    },
    hydrate: (dehydrated: DehydratedI18n) => {
      const { i18nStore, i18nLang, i18nComplete } = dehydrated
      const langData = i18nStore?.[i18nLang]
      if (langData) {
        for (const [ns, resources] of Object.entries(langData)) {
          addBundle(i18nLang, ns, resources, { overwrite: true, silent: true })
        }
        markNamespacesComplete(i18nLang, i18nComplete ?? Object.keys(langData))
      }
      if (i18nLang && i18n.language !== i18nLang) {
        i18n.changeLanguage(i18nLang)
      }
    },
  })

  currentPathname = () => router.state.location.pathname

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
