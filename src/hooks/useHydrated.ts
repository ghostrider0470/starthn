import { useEffect, useState } from 'react'

/**
 * False on the server and during the hydration render, true from the first
 * client effect on. Gate client-only output (e.g. animations) on it so the
 * first client render matches the server HTML.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  return hydrated
}
