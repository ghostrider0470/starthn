/**
 * Runs `callback` once, at whichever comes first:
 *
 *   - the visitor's first interaction (pointer, key or touch; scrolling is
 *     not a sign of wanting the chat, and the bandwidth is better spent on
 *     the images being scrolled into view);
 *   - an idle period after the page has finished loading plus `delayMs`.
 *
 * Used to keep non-critical UI (the chat launcher and its animation library)
 * off the critical path: nothing it loads competes with the stylesheet, the
 * LCP image or hydration, and on a slow phone the launcher simply appears a
 * little later. Returns a cancel function.
 */
export const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const

export interface WhenIdleOptions {
  /** Extra wait after the load event before looking for an idle period. */
  delayMs?: number
  /** Upper bound for requestIdleCallback once the delay has passed. */
  idleTimeoutMs?: number
}

export function whenIdleOrInteraction(
  callback: () => void,
  { delayMs = 2000, idleTimeoutMs = 2000 }: WhenIdleOptions = {},
): () => void {
  if (typeof window === 'undefined') return () => {}

  let settled = false
  const cleanups: Array<() => void> = []
  const cancel = () => {
    settled = true
    while (cleanups.length) cleanups.pop()?.()
  }
  const run = () => {
    if (settled) return
    cancel()
    callback()
  }

  const listenerOptions: AddEventListenerOptions = {
    capture: true,
    passive: true,
  }
  for (const type of INTERACTION_EVENTS) {
    window.addEventListener(type, run, listenerOptions)
    cleanups.push(() => window.removeEventListener(type, run, listenerOptions))
  }

  const waitForIdle = () => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: idleTimeoutMs })
      cleanups.push(() => window.cancelIdleCallback(id))
    } else {
      const id = window.setTimeout(run, 0)
      cleanups.push(() => window.clearTimeout(id))
    }
  }
  const afterLoad = () => {
    if (settled) return
    const id = window.setTimeout(waitForIdle, delayMs)
    cleanups.push(() => window.clearTimeout(id))
  }

  if (document.readyState === 'complete') {
    afterLoad()
  } else {
    window.addEventListener('load', afterLoad, { once: true })
    cleanups.push(() => window.removeEventListener('load', afterLoad))
  }

  return cancel
}
