/**
 * Unified analytics layer — wraps GA4 + Microsoft Clarity behind a single API.
 * All provider imports are dynamic to avoid crashing the Worker (no `window` on server).
 *
 * Consent (decision D4): nothing here loads a script or sets a cookie unless
 * getConsent() === 'granted'. Every call re-checks consent, so a visitor who
 * has not decided (or declined) never downloads gtag.js or the Clarity tag.
 *
 * Usage:
 *   analytics.init()                          — load GA4 + Clarity (after consent)
 *   analytics.identify(userId, { role })      — link session to authenticated user
 *   analytics.page(path, title)               — track page view
 *   analytics.event('cta_click', { label })   — track custom event
 *   analytics.setUserProperties({ plan })     — set persistent user properties
 *   analytics.reset()                         — clear identity on logout
 *   analytics.revoke()                        — consent withdrawn: stop + clear cookies
 */
import type ReactGA4 from 'react-ga4'
import type ClarityDefault from '@microsoft/clarity'
import { getConsent } from '@/lib/consent'

const GA_MEASUREMENT_ID = 'G-ECRK2ED5C4'
const CLARITY_PROJECT_ID = 'wayn0660lq'

type GA = typeof ReactGA4
type ClarityApi = typeof ClarityDefault
type Traits = Record<string, string | number | boolean>

/** Trait keys that are personal data and must never reach GA or Clarity tags. */
const PII_TRAIT_KEYS = new Set(['email', 'name'])

/** Resolves to null when consent was withdrawn while react-ga4 loaded. */
let gaReady: Promise<GA | null> | null = null
let clarityReady: Promise<ClarityApi> | null = null
let clarityStarted = false
/** True after revoke(), until consent is granted again. */
let revoked = false

function isClient(): boolean {
  return typeof window !== 'undefined'
}

function hasConsent(): boolean {
  return isClient() && getConsent() === 'granted'
}

/** GA's official opt-out flag: when true, gtag.js sends nothing. */
function setGADisabled(disabled: boolean): void {
  ;(window as unknown as Record<string, unknown>)[
    `ga-disable-${GA_MEASUREMENT_ID}`
  ] = disabled
}

function withoutPII(traits: Traits): Traits {
  return Object.fromEntries(
    Object.entries(traits).filter(([key]) => !PII_TRAIT_KEYS.has(key)),
  )
}

/**
 * Load and initialize GA4 once; every caller awaits the same promise, so a
 * page() fired while react-ga4 is still downloading is sent, not dropped.
 * Callers must check hasConsent() first. Resolves to null — and never
 * injects gtag.js — when consent was withdrawn while the chunk loaded; the
 * next init() after a new grant loads it again.
 */
function loadGA(): Promise<GA | null> {
  if (!gaReady) {
    gaReady = import('react-ga4')
      .then(({ default: ReactGA }) => {
        // Re-check: consent may have been withdrawn while the chunk loaded.
        // initialize() injects gtag.js from Google, so it must not run then.
        if (!hasConsent()) {
          setGADisabled(true)
          gaReady = null
          return null
        }
        setGADisabled(false)
        // Visitor consented to analytics only — keep advertising signals off.
        ReactGA.gtag('consent', 'default', {
          analytics_storage: 'granted',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        })
        ReactGA.initialize(GA_MEASUREMENT_ID, {
          gtagOptions: { send_page_view: false },
        })
        return ReactGA
      })
      .catch((error: unknown) => {
        gaReady = null
        throw error
      })
  }
  return gaReady
}

/** Inject the Clarity tag once, with an analytics-only consent signal. */
function startClarity(clarity: ClarityApi): void {
  if (clarityStarted) return
  clarityStarted = true
  clarity.init(CLARITY_PROJECT_ID)
  clarity.consentV2({ ad_Storage: 'denied', analytics_Storage: 'granted' })
}

/**
 * Load Clarity once and start it if consent still holds when the chunk
 * arrives. Callers must check hasConsent() first.
 */
function loadClarity(): Promise<ClarityApi> {
  if (!clarityReady) {
    clarityReady = import('@microsoft/clarity')
      .then(({ default: Clarity }) => {
        if (hasConsent()) startClarity(Clarity)
        return Clarity
      })
      .catch((error: unknown) => {
        clarityReady = null
        throw error
      })
  }
  return clarityReady
}

/**
 * Initialize all analytics providers. Safe to call repeatedly; does nothing
 * without consent. Also re-enables tracking after an earlier revoke().
 */
async function init(): Promise<void> {
  if (!hasConsent()) return
  setGADisabled(false)
  const [ga, clarity] = await Promise.all([loadGA(), loadClarity()])
  // Withdrawn while the providers were loading.
  if (!ga || !hasConsent()) return
  startClarity(clarity)
  if (revoked) {
    revoked = false
    ga.gtag('consent', 'update', { analytics_storage: 'granted' })
    clarity.consentV2({ ad_Storage: 'denied', analytics_Storage: 'granted' })
  }
}

/**
 * Identify the current user across all providers by their opaque id. No PII
 * is forwarded: email and name are dropped from the traits, and Clarity gets
 * no friendly name.
 */
async function identify(userId: string, traits?: Traits): Promise<void> {
  if (!hasConsent()) return
  const safeTraits = traits ? withoutPII(traits) : undefined

  const ga = await loadGA()
  if (!ga) return
  ga.gtag('config', GA_MEASUREMENT_ID, {
    user_id: userId,
    send_page_view: false,
  })
  if (safeTraits && Object.keys(safeTraits).length) {
    ga.gtag('set', 'user_properties', safeTraits)
  }

  const clarity = await loadClarity()
  if (!clarityStarted) return
  clarity.identify(userId)
  if (safeTraits) {
    for (const [key, value] of Object.entries(safeTraits)) {
      clarity.setTag(key, String(value))
    }
  }
}

/**
 * Track a page view. `path` should be pathname + search. The title defaults
 * to document.title at send time.
 */
async function page(path: string, title?: string): Promise<void> {
  if (!hasConsent()) return
  const ga = await loadGA()
  if (!ga || !hasConsent()) return // withdrawn while gtag was loading
  ga.send({
    hitType: 'pageview',
    page: path,
    title: title ?? document.title,
  })
}

/**
 * Track a custom event.
 *
 * @example
 *   analytics.event('cta_click', { label: 'hero_get_started' })
 *   analytics.event('form_submit', { category: 'contact', value: 1 })
 *   analytics.event('blog_read', { slug: 'my-post', readTime: 120 })
 */
async function event(name: string, params?: Traits): Promise<void> {
  if (!hasConsent()) return

  const ga = await loadGA()
  if (!ga) return
  ga.event(name, params)

  const clarity = await loadClarity()
  if (clarityStarted) clarity.event(name)
}

/** Set persistent user properties on GA4. */
async function setUserProperties(properties: Traits): Promise<void> {
  if (!hasConsent()) return
  const ga = await loadGA()
  if (!ga) return
  ga.gtag('set', 'user_properties', withoutPII(properties))
}

/**
 * Clear user identity (call on logout). Unlike the other calls it never loads
 * GA by itself — it runs for every anonymous visitor on mount, and loading
 * gtag.js just to clear an identity that was never set would defeat the
 * idle-time deferral in useAnalytics.
 */
async function reset(): Promise<void> {
  if (!hasConsent() || !gaReady) return
  const ga = await loadGA()
  if (!ga) return
  ga.gtag('config', GA_MEASUREMENT_ID, {
    user_id: undefined,
    send_page_view: false,
  })
}

/** Expire first-party analytics cookies on this host and its parent domains. */
function deleteAnalyticsCookies(): void {
  if (typeof document === 'undefined') return
  let names: Array<string> = []
  try {
    names = document.cookie
      .split(';')
      .map((part) => part.split('=')[0]?.trim() ?? '')
      .filter((name) => /^(_ga(_.+)?|_gid|_gat(_.+)?|_clck|_clsk)$/.test(name))
  } catch {
    return
  }
  if (!names.length) return

  const labels = window.location.hostname.split('.')
  const domains: Array<string | null> = [null]
  for (let i = 0; i < labels.length - 1; i++) {
    domains.push(labels.slice(i).join('.'))
  }

  for (const name of names) {
    for (const domain of domains) {
      try {
        document.cookie = `${name}=; Max-Age=0; path=/${
          domain ? `; domain=${domain}` : ''
        }`
      } catch {
        // Cookie writes can throw in sandboxed contexts — ignore.
      }
    }
  }
}

/**
 * Consent withdrawn: stop both providers and delete their cookies. Providers
 * that were never loaded are not loaded just to be switched off.
 */
async function revoke(): Promise<void> {
  if (!isClient()) return
  revoked = true
  setGADisabled(true)

  if (gaReady) {
    try {
      const ga = await gaReady
      ga?.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      })
    } catch {
      // GA failed to load — nothing to switch off.
    }
  }

  if (clarityReady) {
    try {
      const clarity = await clarityReady
      if (clarityStarted) {
        clarity.consentV2({ ad_Storage: 'denied', analytics_Storage: 'denied' })
        // Erases Clarity's cookies and stops tracking until consent is granted again.
        clarity.consent(false)
      }
    } catch {
      // Clarity failed to load — nothing to switch off.
    }
  }

  deleteAnalyticsCookies()
}

export const analytics = {
  init,
  identify,
  page,
  event,
  setUserProperties,
  reset,
  revoke,
} as const

/** Test helper: forget loaded providers so each test starts clean. */
export function __resetAnalyticsForTests(): void {
  gaReady = null
  clarityReady = null
  clarityStarted = false
  revoked = false
}
