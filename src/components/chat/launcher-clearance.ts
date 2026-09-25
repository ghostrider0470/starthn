import { useEffect, useSyncExternalStore } from 'react'
import type { RefObject } from 'react'

/**
 * Keeps the fixed chat launcher from covering controls it floats over.
 *
 * The launcher is anchored to the bottom inline-end corner (see ChatWidget).
 * A page marks the controls that must stay reachable with
 * `data-chat-launcher-avoid` and calls `useChatLauncherClearance` on a
 * container; while any marked element intersects the launcher's box, the
 * launcher steps aside. It comes back as soon as the element scrolls clear.
 * This is layout-independent: it holds for long translations, short phones
 * and RTL alike, where fixed bottom padding does not.
 */

export const LAUNCHER_AVOID_ATTR = 'data-chat-launcher-avoid'

// Must match the launcher classes in ChatWidget:
// `h-14 w-14 bottom-6 end-6 max-md:bottom-24`.
const LAUNCHER_SIZE = 56
const LAUNCHER_INSET_END = 24
const LAUNCHER_BOTTOM_DESKTOP = 24
const LAUNCHER_BOTTOM_PHONE = 96

export type Box = { top: number; right: number; bottom: number; left: number }

/** The launcher's viewport rectangle for a given viewport and direction. */
export function launcherBox(
  viewportWidth: number,
  viewportHeight: number,
  { rtl, desktop }: { rtl: boolean; desktop: boolean },
): Box {
  const bottomInset = desktop ? LAUNCHER_BOTTOM_DESKTOP : LAUNCHER_BOTTOM_PHONE
  const left = rtl
    ? LAUNCHER_INSET_END
    : viewportWidth - LAUNCHER_INSET_END - LAUNCHER_SIZE
  const bottom = viewportHeight - bottomInset
  return {
    top: bottom - LAUNCHER_SIZE,
    right: left + LAUNCHER_SIZE,
    bottom,
    left,
  }
}

/**
 * IntersectionObserver `rootMargin` that shrinks the viewport to `box`, so an
 * observed element "intersects" exactly when it overlaps the launcher.
 */
export function rootMarginFor(
  box: Box,
  viewportWidth: number,
  viewportHeight: number,
): string {
  const px = (n: number) => {
    const inset = Math.max(0, Math.round(n))
    return inset ? `-${inset}px` : '0px'
  }
  return [
    px(box.top),
    px(viewportWidth - box.right),
    px(viewportHeight - box.bottom),
    px(box.left),
  ].join(' ')
}

// ─── "Is the launcher over a protected control?" store ─────────────────────
// One entry per mounted container that currently reports an overlap. Server
// and first client render: nothing covered.

const coveringOwners = new Set<object>()
const listeners = new Set<() => void>()

function setCovering(owner: object, covering: boolean): void {
  const had = coveringOwners.has(owner)
  if (had === covering) return
  if (covering) coveringOwners.add(owner)
  else coveringOwners.delete(owner)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** True while the launcher would cover a marked control. False during SSR. */
export function useChatLauncherCovering(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => coveringOwners.size > 0,
    () => false,
  )
}

/**
 * Watches the `[data-chat-launcher-avoid]` elements inside `containerRef`
 * and reports when one of them sits under the launcher.
 */
export function useChatLauncherClearance(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): void {
  useEffect(() => {
    const container = containerRef.current
    if (!enabled || !container) return
    if (typeof IntersectionObserver === 'undefined') return

    const owner = {}
    const targets = Array.from(
      container.querySelectorAll(`[${LAUNCHER_AVOID_ATTR}]`),
    )
    if (!targets.length) return

    const overlapping = new Set<Element>()
    const desktopQuery = window.matchMedia('(min-width: 48rem)')
    let observer: IntersectionObserver | null = null
    let frame: number | null = null

    const connect = () => {
      frame = null
      observer?.disconnect()
      overlapping.clear()
      const width = document.documentElement.clientWidth
      const height = window.innerHeight
      const box = launcherBox(width, height, {
        rtl: getComputedStyle(document.documentElement).direction === 'rtl',
        desktop: desktopQuery.matches,
      })
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            // Edge contact (zero-area intersection) is not an overlap.
            const overlap = entry.intersectionRect
            if (
              entry.isIntersecting &&
              overlap.width > 0 &&
              overlap.height > 0
            ) {
              overlapping.add(entry.target)
            } else {
              overlapping.delete(entry.target)
            }
          }
          setCovering(owner, overlapping.size > 0)
        },
        { rootMargin: rootMarginFor(box, width, height) },
      )
      for (const target of targets) observer.observe(target)
    }

    const schedule = () => {
      if (frame == null) frame = requestAnimationFrame(connect)
    }

    connect()
    window.addEventListener('resize', schedule)
    return () => {
      if (frame != null) cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedule)
      observer?.disconnect()
      setCovering(owner, false)
    }
  }, [containerRef, enabled])
}
