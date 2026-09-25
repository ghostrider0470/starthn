// Client side of the partial i18n store (jsdom: src/i18n.ts takes its client
// path). The page's HTML carries only the namespaces and `pages` subtrees it
// renders (src/lib/i18n-route-namespaces.ts); these tests cover how the
// client fills in the rest.
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n, {
  addBundle,
  ensureClientResources,
  ensureRouteResources,
  isNamespaceComplete,
  markNamespacesComplete,
} from '@/i18n'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubFetch(bodies: Record<string, unknown>) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    return Promise.resolve(
      url in bodies ? jsonResponse(bodies[url]) : jsonResponse({}, 404),
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ensureClientResources', () => {
  it('does not fetch what the page already has', async () => {
    addBundle('bs-BA', 'pages', { contact: { title: 'Kontakt' } }, {
      overwrite: true,
      silent: true,
    })
    markNamespacesComplete('bs-BA', ['common'])
    const fetchMock = stubFetch({})

    await ensureClientResources('bs-BA', ['common', 'pages:contact'])

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches a namespace whose subtree is missing, keeping existing strings', async () => {
    addBundle('en-US', 'pages', { contact: { title: 'Contact (SSR)' } }, {
      overwrite: true,
      silent: true,
    })
    const fetchMock = stubFetch({
      '/locales/en-US/pages.json': {
        contact: { title: 'Contact', intro: 'Write to us' },
        about: { title: 'About us' },
      },
    })

    await ensureClientResources('en-US', ['pages:contact', 'pages:about'])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/locales/en-US/pages.json')
    expect(i18n.getResource('en-US', 'pages', 'about.title')).toBe('About us')
    expect(i18n.getResource('en-US', 'pages', 'contact.intro')).toBe('Write to us')
    expect(i18n.getResource('en-US', 'pages', 'contact.title')).toBe(
      'Contact (SSR)',
    )
    expect(isNamespaceComplete('en-US', 'pages')).toBe(true)

    await ensureClientResources('en-US', ['pages:careers'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shares one request between concurrent callers', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchMock = stubFetch({
      '/locales/hr-HR/landing.json': { hero: { title: 'Naslov' } },
    })

    await Promise.all([
      ensureClientResources('hr-HR', ['landing']),
      ensureClientResources('hr-HR', ['landing']),
      ensureRouteResources('/hr-HR'),
    ])

    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).endsWith('landing.json')),
    ).toHaveLength(1)
    expect(i18n.getResource('hr-HR', 'landing', 'hero.title')).toBe('Naslov')
  })

  it('logs a failed fetch and retries on the next call', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const failing = stubFetch({})

    await ensureClientResources('de-DE', ['blog'])
    expect(failing).toHaveBeenCalledTimes(1)
    expect(isNamespaceComplete('de-DE', 'blog')).toBe(false)

    const working = stubFetch({ '/locales/de-DE/blog.json': { author: 'Autor' } })
    await ensureClientResources('de-DE', ['blog'])
    expect(working).toHaveBeenCalledTimes(1)
    expect(isNamespaceComplete('de-DE', 'blog')).toBe(true)
  })
})

describe('ensureRouteResources', () => {
  it("loads the next page's namespaces for its URL locale", async () => {
    markNamespacesComplete('fr-FR', ['common', 'seo'])
    addBundle('fr-FR', 'pages', { error: { title: 'Erreur' } }, {
      overwrite: true,
      silent: true,
    })
    addBundle('fr-FR', 'landing', { chat: { openChat: 'Chat' } }, {
      overwrite: true,
      silent: true,
    })
    const fetchMock = stubFetch({
      '/locales/fr-FR/pages.json': { contact: { title: 'Contact' } },
    })

    await ensureRouteResources('/fr-FR/contact')

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      '/locales/fr-FR/pages.json',
    ])
    expect(i18n.getFixedT('fr-FR', 'pages')('contact.title')).toBe('Contact')
  })
})

describe('missing keys', () => {
  it('fetch the rest of a partial namespace and re-render readers', async () => {
    window.history.replaceState(null, '', '/it-IT/about')
    addBundle('it-IT', 'pages', { error: { title: 'Errore' } }, {
      overwrite: true,
      silent: true,
    })
    const fetchMock = stubFetch({
      '/locales/it-IT/pages.json': { about: { title: 'Chi siamo' } },
    })
    const added = new Promise<string>((resolve) =>
      i18n.store.on('added', (lng: string, ns: string) => {
        if (lng === 'it-IT') resolve(ns)
      }),
    )

    const t = i18n.getFixedT('it-IT', 'pages')
    expect(t('about.title')).toBe('about.title')

    await expect(added).resolves.toBe('pages')
    expect(fetchMock).toHaveBeenCalledWith('/locales/it-IT/pages.json')
    expect(t('about.title')).toBe('Chi siamo')
  })

  it('only fetch for the locale of the page URL', () => {
    window.history.replaceState(null, '', '/bs-BA/about')
    const fetchMock = stubFetch({})

    // The language switcher changes the language before loading the new URL.
    i18n.getFixedT('ko-KR', 'pages')('about.title')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('do not fetch a namespace the client holds in full', () => {
    window.history.replaceState(null, '', '/es-ES/about')
    markNamespacesComplete('es-ES', ['pages'])
    const fetchMock = stubFetch({})

    i18n.getFixedT('es-ES', 'pages')('really.missing', { defaultValue: 'x' })

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
