/**
 * Share the ASSETS binding with i18n during SSR.
 *
 * Production: Hono handler stores env.ASSETS (Worker static assets).
 * Local dev:  No ASSETS binding — loadTranslationsForSSR uses Vite
 *             import.meta.glob to read locale files directly.
 *
 * The binding is an isolate-wide constant: it is set on every request and
 * never cleared, so concurrent requests cannot unset it for each other.
 */

let currentAssets: Fetcher | null = null

export function setAssets(assets: Fetcher | undefined) {
  currentAssets = assets ?? null
}

/** Returns ASSETS binding if set (production), or null (dev). */
export function getAssets(): Fetcher | null {
  return currentAssets
}
