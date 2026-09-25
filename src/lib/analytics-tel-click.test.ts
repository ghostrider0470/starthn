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

beforeEach(() => {
  window.localStorage.clear()
  __resetConsentMemoryForTests()
  __resetAnalyticsForTests()
  vi.clearAllMocks()
})

describe('analytics.telClick', () => {
  it.each([
    ['no decision', null],
    ['declined', 'denied'],
  ] as const)('%s: loads nothing and sends nothing', async (_, value) => {
    if (value) setConsent(value)

    await analytics.telClick('header')

    expect(ga.initialize).not.toHaveBeenCalled()
    expect(ga.event).not.toHaveBeenCalled()
    expect(ga.gtag).not.toHaveBeenCalled()
    expect(clarity.init).not.toHaveBeenCalled()
    expect(clarity.event).not.toHaveBeenCalled()
  })

  it('after consent: sends a GA4 tel_click event with its placement', async () => {
    setConsent('granted')

    await analytics.telClick('contact_hero')

    expect(ga.event).toHaveBeenCalledWith('tel_click', {
      placement: 'contact_hero',
    })
    expect(clarity.event).toHaveBeenCalledWith('tel_click')
  })
})
