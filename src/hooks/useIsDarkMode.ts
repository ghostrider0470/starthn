import { useState, useEffect } from 'react'

/**
 * Detects whether the app is in dark mode by watching the `dark` class
 * on <html>. Works inside R3F Canvas (no React context dependency).
 */
export function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const update = () =>
      setIsDark(document.documentElement.classList.contains('dark'))

    // Sync initial value in case SSR defaulted to false
    update()

    // ThemeProvider toggles the class on <html>
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    // Also listen for system theme changes (covers theme='system')
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', update)

    return () => {
      observer.disconnect()
      mq.removeEventListener('change', update)
    }
  }, [])

  return isDark
}
