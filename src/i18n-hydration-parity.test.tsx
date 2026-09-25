// Partial i18n dehydration (src/lib/i18n-route-namespaces.ts): a page must
// render exactly the same markup from the resources its HTML carries as from
// the locale's whole catalog, and no t() call may miss a key. Otherwise the
// client would hydrate raw keys (a hydration mismatch) where the server
// rendered text.
//
// Kept outside src/routes so the router generator never sees it as a route.
import fs from 'node:fs'
import path from 'node:path'
import { prerender } from 'react-dom/static'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type * as TanStackRouter from '@tanstack/react-router'
import type { ComponentType, ReactNode } from 'react'
import i18n, { I18N_NAMESPACES } from '@/i18n'
import { resourcesForPath, selectResources } from '@/lib/i18n-route-namespaces'

const routerState = vi.hoisted(() => ({ pathname: '/bs-BA' }))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof TanStackRouter>()
  return {
    ...actual,
    createFileRoute: () => (options: Record<string, unknown>) => ({ options }),
    Link: ({
      to,
      children,
      ...rest
    }: {
      to: string
      children?: ReactNode
      [key: string]: unknown
    }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
    useLocation: () => ({ pathname: routerState.pathname }),
  }
})

const LOCALES_DIR = path.resolve(process.cwd(), 'public/locales')

function readCatalog(locale: string): Record<string, Record<string, unknown>> {
  return Object.fromEntries(
    I18N_NAMESPACES.map((ns) => [
      ns,
      JSON.parse(
        fs.readFileSync(path.join(LOCALES_DIR, locale, `${ns}.json`), 'utf8'),
      ) as Record<string, unknown>,
    ]),
  )
}

type RouteModule = { Route: { options: { component: ComponentType } } }

const PAGES: ReadonlyArray<[string, () => Promise<unknown>]> = [
  ['', () => import('@/routes/{-$locale}/index')],
  ['/contact', () => import('@/routes/{-$locale}/contact')],
  ['/about', () => import('@/routes/{-$locale}/about')],
  ['/mission-vision', () => import('@/routes/{-$locale}/mission-vision')],
  ['/certificates', () => import('@/routes/{-$locale}/certificates')],
  ['/careers', () => import('@/routes/{-$locale}/careers')],
  ['/education', () => import('@/routes/{-$locale}/education')],
  ['/support', () => import('@/routes/{-$locale}/support')],
  ['/services', () => import('@/routes/{-$locale}/services.index')],
  [
    '/services/bookkeeping-accounting',
    () => import('@/routes/{-$locale}/services/bookkeeping-accounting'),
  ],
]

const LOCALES = ['bs-BA', 'en-US', 'hr-HR', 'de-DE']

async function renderToHtml(Page: ComponentType): Promise<string> {
  const { prelude } = await prerender(<Page />)
  return new Response(prelude).text()
}

const originalData = i18n.store.data
const missing: Array<string> = []

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  // No network: a missing key must show up in `missing`, not be fetched.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
  vi.spyOn(console, 'error').mockImplementation(() => {})
  i18n.on('missingKey', (lngs: ReadonlyArray<string>, ns: string, key: string) => {
    missing.push(`${lngs.join(',')}/${ns}:${key}`)
  })
})

afterAll(() => {
  i18n.store.data = originalData
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('pages render the same from their dehydrated resources', () => {
  for (const locale of LOCALES) {
    const catalog = readCatalog(locale)

    it.each(PAGES.map(([p, load]) => [`/${locale}${p}`, load] as const))(
      '%s',
      async (pathname, load) => {
        routerState.pathname = pathname
        window.history.replaceState(null, '', pathname)
        const { Route } = (await load()) as RouteModule
        const Page = Route.options.component

        // Before: the client held the locale's whole catalog.
        i18n.store.data = { [locale]: structuredClone(catalog) }
        await i18n.changeLanguage(locale)
        missing.length = 0
        const full = await renderToHtml(Page)
        const missingWithFullCatalog = [...missing]

        // Now: only what the page's HTML carries.
        const { resources } = selectResources(catalog, resourcesForPath(pathname))
        i18n.store.data = { [locale]: structuredClone(resources) }
        missing.length = 0
        const partial = await renderToHtml(Page)

        expect(missing.filter((k) => !missingWithFullCatalog.includes(k))).toEqual([])
        expect(partial).toBe(full)
        expect(full.length).toBeGreaterThan(1000)
      },
    )
  }
})
