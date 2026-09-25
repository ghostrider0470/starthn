import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Code that only matters once someone interacts (a menu's popover, the mobile
 * menu sheet, the desktop dropdown navigation) is kept out of the entry chunk
 * and loaded on demand, so it never competes with the CSS, fonts and hero
 * image on first load. The server and the first client render show a plain,
 * identical-looking trigger; the interactive version replaces it once loaded.
 */

type Loader<T> = () => Promise<T>

const pending = new Map<Loader<unknown>, Promise<unknown>>()
const resolved = new Map<Loader<unknown>, unknown>()

/**
 * Loads `loader` once and shares the result. A failed load (for example a
 * chunk removed by a new deploy) is forgotten, so the next call retries.
 */
export function loadDeferred<T>(loader: Loader<T>): Promise<T> {
  const existing = pending.get(loader)
  if (existing) return existing as Promise<T>
  const promise = loader().then(
    (module) => {
      resolved.set(loader, module)
      return module
    },
    (error: unknown) => {
      pending.delete(loader)
      throw error
    },
  )
  pending.set(loader, promise)
  return promise
}

/** The module, if `loader` has already finished loading. */
export function getLoaded<T>(loader: Loader<T>): T | undefined {
  return resolved.get(loader) as T | undefined
}

/**
 * `[module, load]`: `module` is null until `load()` has resolved. Loaders must
 * be stable (declared at module scope). A module loaded earlier (e.g. before a
 * remount) is available on the first render; during hydration it never is,
 * because nothing loads before the page is interactive.
 */
export function useDeferredModule<T>(
  loader: Loader<T>,
): [T | null, () => Promise<T | null>] {
  const [module, setModule] = useState<T | null>(
    () => getLoaded(loader) ?? null,
  )
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const load = useCallback(
    () =>
      loadDeferred(loader).then(
        (loaded) => {
          if (mounted.current) setModule(() => loaded)
          return loaded
        },
        (error: unknown) => {
          console.error('[deferred] module failed to load:', error)
          return null
        },
      ),
    [loader],
  )

  return [module, load]
}
