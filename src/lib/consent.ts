/**
 * Analytics cookie consent (decision D4).
 *
 * GA4 and Microsoft Clarity may only load after the visitor explicitly accepts
 * in the cookie banner. The decision lives in localStorage under
 * CONSENT_STORAGE_KEY as the plain string 'granted' or 'denied'.
 *
 * SSR-safe: nothing touches `window` at import time, and every storage access
 * is wrapped in try/catch (private mode, blocked site data and sandboxed
 * iframes can all make localStorage throw). When the choice cannot be
 * persisted it is kept in memory for the rest of the page session, so the
 * banner does not come back on every client-side navigation.
 */

export type ConsentValue = 'granted' | 'denied'

export const CONSENT_STORAGE_KEY = 'starthn-consent'
/** Fired on window by setConsent(); `event.detail` is the new ConsentValue. */
export const CONSENT_CHANGE_EVENT = 'starthn-consent-change'
/** Fired on window by openCookieSettings() to re-open the banner. */
export const CONSENT_OPEN_EVENT = 'starthn-consent-open'

/** Only set when the last choice could not be written to localStorage. */
let memoryConsent: ConsentValue | null = null

function isConsentValue(value: unknown): value is ConsentValue {
  return value === 'granted' || value === 'denied'
}

function hasWindow(): boolean {
  return typeof window !== 'undefined'
}

function dispatch(name: string, detail?: ConsentValue): void {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }))
  } catch {
    // CustomEvent unavailable (very old browsers) — nothing else to do.
  }
}

/** The visitor's stored decision, or null when they have not decided yet. */
export function getConsent(): ConsentValue | null {
  if (!hasWindow()) return null
  if (memoryConsent) return memoryConsent
  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    return isConsentValue(stored) ? stored : null
  } catch {
    return null
  }
}

/** Persist the visitor's decision and notify listeners (analytics, banner). */
export function setConsent(value: ConsentValue): void {
  if (!hasWindow() || !isConsentValue(value)) return

  let persisted = false
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value)
    persisted = window.localStorage.getItem(CONSENT_STORAGE_KEY) === value
  } catch {
    persisted = false
  }
  memoryConsent = persisted ? null : value

  dispatch(CONSENT_CHANGE_EVENT, value)
}

/** Re-open the cookie banner (e.g. from a "Cookie settings" footer button). */
export function openCookieSettings(): void {
  if (!hasWindow()) return
  dispatch(CONSENT_OPEN_EVENT)
}

/** Subscribe to consent changes. Returns an unsubscribe function. */
export function onConsentChange(
  listener: (value: ConsentValue) => void,
): () => void {
  if (!hasWindow()) return () => {}
  const handler = (event: Event) => {
    const value = (event as CustomEvent<unknown>).detail
    if (isConsentValue(value)) listener(value)
  }
  window.addEventListener(CONSENT_CHANGE_EVENT, handler)
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, handler)
}

/** Subscribe to "open cookie settings" requests. Returns an unsubscribe function. */
export function onCookieSettingsOpen(listener: () => void): () => void {
  if (!hasWindow()) return () => {}
  window.addEventListener(CONSENT_OPEN_EVENT, listener)
  return () => window.removeEventListener(CONSENT_OPEN_EVENT, listener)
}

/** Test helper: forget the in-memory fallback. */
export function __resetConsentMemoryForTests(): void {
  memoryConsent = null
}
