import { beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetAnalyticsForTests, analytics } from './analytics'
import { __resetConsentMemoryForTests, setConsent } from './consent'

const ga = vi.hoisted(() => ({
  initialize: vi.fn(),
  send: vi.fn(),
  event: vi.fn(),
  gtag: vi.fn(),
}))

const clarity = vi.hoisted(() => ({
  init: vi.fn(),
  consentV2: vi.fn(),
  consent: vi.fn(),
  event: vi.fn(),
  identify: vi.fn(),
  setTag: vi.fn(),
}))

vi.mock('react-ga4', () => ({ default: ga }))
vi.mock('@microsoft/clarity', () => ({ default: clarity }))

const GA_DISABLE_FLAG = 'ga-disable-G-ECRK2ED5C4'

beforeEach(() => {
  window.localStorage.clear()
  __resetConsentMemoryForTests()
  __resetAnalyticsForTests()
  vi.clearAllMocks()
  delete (window as unknown as Record<string, unknown>)[GA_DISABLE_FLAG]
})

describe('without consent', () => {
  it.each([
    ['no decision', null],
    ['declined', 'denied'],
  ] as const)('%s: loads nothing and sends nothing', async (_, value) => {
    if (value) setConsent(value)

    await analytics.init()
    await analytics.page('/bs-BA/about', 'About')
    await analytics.event('cta_click', { label: 'hero' })
    await analytics.identify('user-1', { role: 'admin' })
    await analytics.setUserProperties({ plan: 'x' })
    await analytics.reset()

    expect(ga.initialize).not.toHaveBeenCalled()
    expect(ga.send).not.toHaveBeenCalled()
    expect(ga.event).not.toHaveBeenCalled()
    expect(ga.gtag).not.toHaveBeenCalled()
    expect(clarity.init).not.toHaveBeenCalled()
    expect(clarity.event).not.toHaveBeenCalled()
  })
})

describe('with consent', () => {
  beforeEach(() => setConsent('granted'))

  it('init() starts GA4 (no automatic page_view) and Clarity once', async () => {
    await Promise.all([analytics.init(), analytics.init()])

    expect(ga.initialize).toHaveBeenCalledTimes(1)
    expect(ga.initialize).toHaveBeenCalledWith('G-ECRK2ED5C4', {
      gtagOptions: { send_page_view: false },
    })
    expect(clarity.init).toHaveBeenCalledTimes(1)
    expect(clarity.init).toHaveBeenCalledWith('wayn0660lq')
    expect(clarity.consentV2).toHaveBeenCalledWith({
      ad_Storage: 'denied',
      analytics_Storage: 'granted',
    })
  })

  it('page() waits for GA to load instead of dropping the landing page view', async () => {
    await analytics.page('/bs-BA/about?ref=x', 'O nama')

    expect(ga.initialize).toHaveBeenCalledTimes(1)
    expect(ga.send).toHaveBeenCalledWith({
      hitType: 'pageview',
      page: '/bs-BA/about?ref=x',
      title: 'O nama',
    })
  })

  it('page() defaults the title to document.title', async () => {
    document.title = 'Start HN'
    await analytics.page('/bs-BA')
    expect(ga.send).toHaveBeenCalledWith({
      hitType: 'pageview',
      page: '/bs-BA',
      title: 'Start HN',
    })
  })

  it('identify() never forwards email or name as GA/Clarity properties', async () => {
    await analytics.identify('user-1', {
      email: 'someone@example.com',
      name: 'Some One',
      role: 'admin',
    })

    expect(ga.gtag).toHaveBeenCalledWith('set', 'user_properties', {
      role: 'admin',
    })
    // Only the opaque id: no friendly name (the user's full name) either.
    expect(clarity.identify).toHaveBeenCalledWith('user-1')
    expect(clarity.setTag).toHaveBeenCalledTimes(1)
    expect(clarity.setTag).toHaveBeenCalledWith('role', 'admin')
  })

  it('reset() does not load GA by itself', async () => {
    await analytics.reset()
    expect(ga.initialize).not.toHaveBeenCalled()
    expect(ga.gtag).not.toHaveBeenCalled()
  })
})

describe('revoke()', () => {
  it('switches both providers off and deletes their cookies', async () => {
    setConsent('granted')
    await analytics.init()
    document.cookie = '_ga=GA1.1.123; path=/'
    document.cookie = '_clck=abc; path=/'
    document.cookie = 'starthn-theme=dark; path=/'

    setConsent('denied')
    await analytics.revoke()

    expect((window as unknown as Record<string, unknown>)[GA_DISABLE_FLAG]).toBe(
      true,
    )
    expect(ga.gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({ analytics_storage: 'denied' }),
    )
    expect(clarity.consent).toHaveBeenCalledWith(false)
    expect(document.cookie).not.toContain('_ga=')
    expect(document.cookie).not.toContain('_clck=')
    expect(document.cookie).toContain('starthn-theme=dark')

    await analytics.page('/bs-BA')
    expect(ga.send).not.toHaveBeenCalled()
  })

  it('consent withdrawn while the providers load: GA stays disabled, Clarity never starts', async () => {
    setConsent('granted')
    const pending = analytics.init()
    setConsent('denied')
    const revoking = analytics.revoke()
    await Promise.all([pending, revoking])

    expect((window as unknown as Record<string, unknown>)[GA_DISABLE_FLAG]).toBe(
      true,
    )
    expect(clarity.init).not.toHaveBeenCalled()
    // initialize() injects gtag.js from Google: never after a refusal.
    expect(ga.initialize).not.toHaveBeenCalled()
    await analytics.page('/bs-BA')
    expect(ga.send).not.toHaveBeenCalled()
  })

  it('loads gtag.js on the next grant after a withdrawal during loading', async () => {
    setConsent('granted')
    const pending = analytics.init()
    setConsent('denied')
    await Promise.all([pending, analytics.revoke()])
    expect(ga.initialize).not.toHaveBeenCalled()

    setConsent('granted')
    await analytics.init()
    await analytics.page('/bs-BA', 'Start HN')

    expect(ga.initialize).toHaveBeenCalledTimes(1)
    expect(ga.send).toHaveBeenCalledTimes(1)
    expect((window as unknown as Record<string, unknown>)[GA_DISABLE_FLAG]).toBe(
      false,
    )
  })

  it('does not load providers that were never loaded', async () => {
    await analytics.revoke()
    expect(ga.initialize).not.toHaveBeenCalled()
    expect(clarity.init).not.toHaveBeenCalled()
  })

  it('init() after a new grant re-enables tracking', async () => {
    setConsent('granted')
    await analytics.init()
    setConsent('denied')
    await analytics.revoke()
    setConsent('granted')
    await analytics.init()

    expect((window as unknown as Record<string, unknown>)[GA_DISABLE_FLAG]).toBe(
      false,
    )
    expect(ga.gtag).toHaveBeenCalledWith('consent', 'update', {
      analytics_storage: 'granted',
    })
    expect(ga.initialize).toHaveBeenCalledTimes(1)
  })
})
