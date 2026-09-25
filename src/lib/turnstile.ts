/**
 * Cloudflare Turnstile (the contact form's spam check), loaded on demand.
 *
 * The script and its challenge frame are ~120 KB. Loading them with the page
 * made them compete with the /contact first paint, and nothing needs them
 * until the visitor reaches or starts the form, so ContactPage calls this when
 * the form comes near the viewport or gets focus.
 */
export const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js'

let loading: Promise<void> | null = null

/** Appends the Turnstile script once; resolves when window.turnstile exists. */
export function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (loading) return loading

  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT_SRC
    script.async = true
    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () => {
      // Let a later attempt (e.g. after a network blip) try again.
      loading = null
      script.remove()
      reject(new Error('Turnstile failed to load'))
    })
    document.head.appendChild(script)
  })
  return loading
}

/** Test helper: forget a previous load. */
export function resetTurnstileLoaderForTests(): void {
  loading = null
}
