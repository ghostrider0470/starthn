import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_OPEN_EVENT,
  CONSENT_STORAGE_KEY,
  __resetConsentMemoryForTests,
  getConsent,
  onConsentChange,
  onCookieSettingsOpen,
  openCookieSettings,
  setConsent,
} from './consent'

beforeEach(() => {
  window.localStorage.clear()
  __resetConsentMemoryForTests()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getConsent / setConsent', () => {
  it('returns null until the visitor decides', () => {
    expect(getConsent()).toBeNull()
  })

  it('persists the decision under starthn-consent', () => {
    setConsent('granted')
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('granted')
    expect(getConsent()).toBe('granted')

    setConsent('denied')
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('denied')
    expect(getConsent()).toBe('denied')
  })

  it('ignores unknown stored values', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'yes')
    expect(getConsent()).toBeNull()
  })

  it('dispatches starthn-consent-change with the new value', () => {
    const listener = vi.fn()
    window.addEventListener(CONSENT_CHANGE_EVENT, listener)
    setConsent('granted')
    window.removeEventListener(CONSENT_CHANGE_EVENT, listener)

    expect(listener).toHaveBeenCalledTimes(1)
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toBe('granted')
  })
})

describe('storage failures', () => {
  it('getConsent does not throw when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(() => getConsent()).not.toThrow()
    expect(getConsent()).toBeNull()
  })

  it('setConsent does not throw, still notifies, and keeps the choice in memory', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const listener = vi.fn()
    window.addEventListener(CONSENT_CHANGE_EVENT, listener)

    expect(() => setConsent('denied')).not.toThrow()
    window.removeEventListener(CONSENT_CHANGE_EVENT, listener)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(getConsent()).toBe('denied')
  })

  it('survives a localStorage getter that throws', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('Access denied')
      },
    })
    try {
      expect(() => getConsent()).not.toThrow()
      expect(() => setConsent('granted')).not.toThrow()
      expect(getConsent()).toBe('granted')
    } finally {
      if (descriptor) Object.defineProperty(window, 'localStorage', descriptor)
      else delete (window as { localStorage?: Storage }).localStorage
    }
  })
})

describe('events', () => {
  it('openCookieSettings dispatches starthn-consent-open', () => {
    const listener = vi.fn()
    window.addEventListener(CONSENT_OPEN_EVENT, listener)
    openCookieSettings()
    window.removeEventListener(CONSENT_OPEN_EVENT, listener)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('onConsentChange / onCookieSettingsOpen subscribe and unsubscribe', () => {
    const change = vi.fn()
    const open = vi.fn()
    const offChange = onConsentChange(change)
    const offOpen = onCookieSettingsOpen(open)

    setConsent('granted')
    openCookieSettings()
    expect(change).toHaveBeenCalledWith('granted')
    expect(open).toHaveBeenCalledTimes(1)

    offChange()
    offOpen()
    setConsent('denied')
    openCookieSettings()
    expect(change).toHaveBeenCalledTimes(1)
    expect(open).toHaveBeenCalledTimes(1)
  })
})
