/**
 * Unified analytics layer — wraps GA4 + Microsoft Clarity behind a single API.
 * All provider imports are dynamic to avoid crashing the Worker (no `window` on server).
 *
 * Usage:
 *   analytics.init()                          — call once on app mount
 *   analytics.identify(userId, { email })     — link session to authenticated user
 *   analytics.page(path, title)               — track page view
 *   analytics.event('cta_click', { label })   — track custom event
 *   analytics.setUserProperties({ plan })     — set persistent user properties
 *   analytics.reset()                         — clear identity on logout
 */

const GA_MEASUREMENT_ID = 'G-ECRK2ED5C4'
const CLARITY_PROJECT_ID = 'wayn0660lq'

let initialized = false
let ga: typeof import('react-ga4').default | null = null

function isClient(): boolean {
  return typeof window !== 'undefined'
}

/** Initialize all analytics providers. Call once from a client-side effect. */
async function init(): Promise<void> {
  if (!isClient() || initialized) return
  initialized = true

  // GA4 — dynamic import to avoid window reference on server
  const ReactGA = (await import('react-ga4')).default
  ReactGA.initialize(GA_MEASUREMENT_ID, {
    gtagOptions: { send_page_view: false },
  })
  ga = ReactGA

  // Clarity
  const Clarity = (await import('@microsoft/clarity')).default
  Clarity.init(CLARITY_PROJECT_ID)
}

/** Identify the current user across all providers. */
async function identify(
  userId: string,
  traits?: Record<string, string | number | boolean>,
): Promise<void> {
  if (!isClient() || !initialized) return

  // GA4
  if (ga) {
    ga.gtag('config', GA_MEASUREMENT_ID, { user_id: userId })
    if (traits) ga.gtag('set', 'user_properties', traits)
  }

  // Clarity
  const Clarity = (await import('@microsoft/clarity')).default
  const friendlyName = traits?.name as string | undefined
  Clarity.identify(userId, undefined, undefined, friendlyName)
  if (traits) {
    for (const [key, value] of Object.entries(traits)) {
      if (key !== 'name') Clarity.setTag(key, String(value))
    }
  }
}

/** Track a page view. */
function page(path: string, title?: string): void {
  if (!isClient() || !initialized || !ga) return
  ga.send({ hitType: 'pageview', page: path, title })
}

/**
 * Track a custom event.
 *
 * @example
 *   analytics.event('cta_click', { label: 'hero_get_started' })
 *   analytics.event('form_submit', { category: 'contact', value: 1 })
 *   analytics.event('blog_read', { slug: 'my-post', readTime: 120 })
 */
async function event(
  name: string,
  params?: Record<string, string | number | boolean>,
): Promise<void> {
  if (!isClient() || !initialized) return

  if (ga) ga.event(name, params)

  const Clarity = (await import('@microsoft/clarity')).default
  Clarity.event(name)
}

/** Set persistent user properties on GA4. */
function setUserProperties(properties: Record<string, string | number | boolean>): void {
  if (!isClient() || !initialized || !ga) return
  ga.gtag('set', 'user_properties', properties)
}

/** Clear user identity (call on logout). */
function reset(): void {
  if (!isClient() || !initialized || !ga) return
  ga.gtag('config', GA_MEASUREMENT_ID, { user_id: undefined })
}

export const analytics = {
  init,
  identify,
  page,
  event,
  setUserProperties,
  reset,
} as const
