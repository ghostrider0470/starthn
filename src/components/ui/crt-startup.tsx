import { useEffect, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useIsDarkMode } from '@/hooks/useIsDarkMode'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function CRTStartup() {
  const location = useLocation()
  const isDarkMode = useIsDarkMode()
  const prefersReducedMotion = useReducedMotion()
  const [isStarting, setIsStarting] = useState(true)
  const [phase, setPhase] = useState<'off' | 'flash' | 'expanding' | 'fadeIn' | 'complete'>('off')

  // Reset animation on every route change
  useEffect(() => {
    if (!isDarkMode || prefersReducedMotion) {
      setIsStarting(false)
      setPhase('complete')
      return
    }

    setIsStarting(true)
    setPhase('off')

    // Phase 1: Initial flash
    const flashTimer = setTimeout(() => {
      setPhase('flash')
    }, 50)

    // Phase 2: Horizontal line expanding
    const expandTimer = setTimeout(() => {
      setPhase('expanding')
    }, 150)

    // Phase 3: Complete (skip logo)
    const completeTimer = setTimeout(() => {
      setPhase('complete')
    }, 600)

    // Remove overlay
    const removeTimer = setTimeout(() => {
      setIsStarting(false)
    }, 750)

    return () => {
      clearTimeout(flashTimer)
      clearTimeout(expandTimer)
      clearTimeout(completeTimer)
      clearTimeout(removeTimer)
    }
  }, [isDarkMode, location.pathname, prefersReducedMotion])

  if (!isDarkMode || prefersReducedMotion || !isStarting) return null

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* CRT startup effect */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          phase === 'complete' && "opacity-0"
        )}
      >
        {/* Initial flash with Horizon gradient */}
        {phase === 'flash' && (
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, oklch(from var(--primary) l c h / 0.7) 0%, oklch(from var(--accent) l c h / 0.55) 100%)',
              opacity: 0.2
            }}
          />
        )}

        {/* Expanding horizontal line with gradient */}
        {phase === 'expanding' && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
            <div
              className="w-full animate-crt-expand"
              style={{
                height: '2px',
                background:
                  'linear-gradient(90deg, transparent, oklch(from var(--primary) l c h / 0.9) 20%, oklch(from var(--accent) l c h / 0.85) 80%, transparent)',
                boxShadow:
                  '0 0 20px oklch(from var(--primary) l c h / 0.5), 0 0 40px oklch(from var(--accent) l c h / 0.4)',
                animation: 'crt-expand 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards'
              }}
            />
          </div>
        )}


        {/* Vignette effect with Horizon colors */}
        {(phase === 'expanding' || phase === 'fadeIn' || phase === 'complete') && (
          <div
            className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-50"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 30%, var(--background) 100%)'
            }}
          />
        )}

        {/* Corner glow effects */}
        {(phase === 'fadeIn' || phase === 'complete') && (
          <>
            <div
              className="absolute top-0 left-0 w-64 h-64 opacity-30"
              style={{
                background: 'radial-gradient(circle, rgba(255,107,53,0.4) 0%, transparent 70%)',
                filter: 'blur(40px)'
              }}
            />
            <div
              className="absolute bottom-0 right-0 w-64 h-64 opacity-30"
              style={{
                background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)',
                filter: 'blur(40px)'
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
