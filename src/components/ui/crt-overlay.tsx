import { useEffect, useState, useCallback, useRef } from 'react'
import { useCRTSoundContextSafe } from '@/hooks/useCRTSound'
import { useIsDarkMode } from '@/hooks/useIsDarkMode'
import { useReducedMotion } from '@/hooks/useReducedMotion'

type CRTEffectType =
  | 'rgb-split'
  | 'displacement'
  | 'static'
  | 'scanline'
  | 'artifacts'
  | 'macroblock'
  | 'pixel-corruption'
  | 'hot-pixels'

interface SectionGlitchEvent {
  intensity: 'subtle' | 'medium' | 'dramatic'
  effects?: CRTEffectType[]
  duration?: number
  sectionId?: string
}

export function CRTOverlay() {
  const [isJittering, setIsJittering] = useState(false)
  const [isGlitching, setIsGlitching] = useState(false)
  const [glitchEffects, setGlitchEffects] = useState<string[]>([])
  const glitchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextGlitchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sound effects - safely access context (may be null if not in provider)
  const sound = useCRTSoundContextSafe()
  const isDarkMode = useIsDarkMode()
  const prefersReducedMotion = useReducedMotion()
  const crtEnabled = isDarkMode && !prefersReducedMotion

  // Internal glitch trigger function
  const triggerGlitchInternal = useCallback(
    (effects: string[], duration: number) => {
      if (!crtEnabled) return

      // Clear any existing glitch timeout
      if (glitchTimeoutRef.current) {
        clearTimeout(glitchTimeoutRef.current)
      }

      // Play glitch sound
      sound?.playGlitchSound()

      setGlitchEffects(effects)
      setIsGlitching(true)

      glitchTimeoutRef.current = setTimeout(() => {
        setIsGlitching(false)
        setGlitchEffects([])
      }, duration)
    },
    [crtEnabled, sound]
  )

  // Handle link clicks for jitter effect
  useEffect(() => {
    if (!crtEnabled) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')

      if (link && link.href) {
        // Play click sound
        sound?.playClickSound()
        setIsJittering(true)
        setTimeout(() => {
          setIsJittering(false)
        }, 300)
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [crtEnabled, sound])

  // Listen for section-triggered glitch events
  useEffect(() => {
    if (!crtEnabled) return

    const handleSectionGlitch = (e: CustomEvent<SectionGlitchEvent>) => {
      const { intensity, effects, duration } = e.detail

      // Intensity presets
      const intensityPresets: Record<string, CRTEffectType[]> = {
        subtle: ['scanline', 'static'],
        medium: ['rgb-split', 'displacement', 'scanline'],
        dramatic: ['rgb-split', 'displacement', 'static', 'artifacts', 'macroblock'],
      }

      const selectedEffects = effects || intensityPresets[intensity] || intensityPresets.medium
      const glitchDuration =
        duration || (intensity === 'dramatic' ? 400 : intensity === 'medium' ? 300 : 200)

      triggerGlitchInternal(selectedEffects, glitchDuration)
    }

    window.addEventListener('crt-section-glitch', handleSectionGlitch as EventListener)
    return () => {
      window.removeEventListener('crt-section-glitch', handleSectionGlitch as EventListener)
    }
  }, [crtEnabled, triggerGlitchInternal])

  // Periodic automatic glitch effect
  useEffect(() => {
    if (!crtEnabled) return

    const allEffects: CRTEffectType[] = [
      'rgb-split',
      'displacement',
      'static',
      'scanline',
      'artifacts',
      'macroblock',
      'pixel-corruption',
      'hot-pixels',
    ]

    const scheduleNextGlitch = () => {
      // Keep cadence sparse to avoid visual fatigue and unnecessary compositing work.
      const delay = 22000 + Math.random() * 16000
      nextGlitchTimeoutRef.current = setTimeout(triggerRandomGlitch, delay)
    }

    const triggerRandomGlitch = () => {
      if (document.visibilityState !== 'visible') {
        scheduleNextGlitch()
        return
      }

      // Randomly select 1-3 effects
      const numEffects = Math.floor(Math.random() * 3) + 1
      const shuffled = [...allEffects].sort(() => Math.random() - 0.5)
      const selectedEffects = shuffled.slice(0, numEffects)
      const duration = 200 + Math.random() * 300

      triggerGlitchInternal(selectedEffects, duration)

      // Schedule next glitch after this one ends
      setTimeout(scheduleNextGlitch, duration + 100)
    }

    // First glitch after initial content settles
    nextGlitchTimeoutRef.current = setTimeout(triggerRandomGlitch, 12000)

    return () => {
      if (nextGlitchTimeoutRef.current) {
        clearTimeout(nextGlitchTimeoutRef.current)
      }
      if (glitchTimeoutRef.current) {
        clearTimeout(glitchTimeoutRef.current)
      }
    }
  }, [crtEnabled, triggerGlitchInternal])

  // Ensure transient states are reset when CRT becomes disabled.
  useEffect(() => {
    if (crtEnabled) return

    setIsJittering(false)
    setIsGlitching(false)
    setGlitchEffects([])

    if (nextGlitchTimeoutRef.current) {
      clearTimeout(nextGlitchTimeoutRef.current)
      nextGlitchTimeoutRef.current = null
    }
    if (glitchTimeoutRef.current) {
      clearTimeout(glitchTimeoutRef.current)
      glitchTimeoutRef.current = null
    }
  }, [crtEnabled])

  if (!crtEnabled) {
    return null
  }

  return (
    <>
      {/* Custom CRT cursor */}
      <style>{`
        body {
          cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill="rgba(255,107,53,0.9)" stroke="rgba(236,72,153,0.6)" stroke-width="1"/><circle cx="3" cy="3" r="2" fill="rgba(255,107,53,0.5)"/></svg>'), auto;
        }
        a:hover, button:hover, [role="button"]:hover {
          cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M4 4L12.07 22.97L15.58 14.58L23.97 12.07L4 4Z" fill="rgba(236,72,153,0.95)" stroke="rgba(168,85,247,0.7)" stroke-width="1.5"/><circle cx="4" cy="4" r="3" fill="rgba(255,107,53,0.7)"/><circle cx="4" cy="4" r="6" fill="none" stroke="rgba(255,107,53,0.3)" stroke-width="1"/></svg>'), pointer;
        }
      `}</style>

      <div
        className="fixed inset-0 z-[10000] pointer-events-none"
        style={{
          animation: isJittering ? 'crt-jitter 0.3s ease-out' : 'none',
          willChange: isJittering ? 'transform, filter' : 'auto',
          filter: 'contrast(1.05) brightness(1.02)'
        }}
      >
      {/* CRT scanlines - horizontal rows with moving effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-30"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgb(0 0 0 / 0.3) 0px, rgb(0 0 0 / 0.3) 1px, transparent 1px, transparent 3px)',
          backgroundSize: '100% 3px',
          animation: 'scanline-move 8s linear infinite'
        }}
      />

      {/* Secondary scanline layer for depth */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10 dark:opacity-20"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, rgb(0 0 0 / 0.25) 2px, transparent 4px)',
          backgroundSize: '100% 4px'
        }}
      />

      {/* CRT pixel grid - RGB subpixels */}
      <div
        className="absolute inset-0 pointer-events-none opacity-8 dark:opacity-15"
        style={{
          backgroundImage: `
            repeating-linear-gradient(90deg,
              rgba(255,0,0,0.05) 0px,
              rgba(0,255,0,0.05) 2px,
              rgba(0,0,255,0.05) 4px,
              transparent 6px
            ),
            repeating-linear-gradient(0deg,
              transparent 0px,
              rgb(0 0 0 / 0.06) 2px,
              transparent 4px
            )
          `,
          backgroundSize: '6px 4px'
        }}
      />

      {/* Phosphor glow effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5 dark:opacity-10"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,107,53,0.15) 0%, transparent 60%)',
          mixBlendMode: 'screen',
          animation: 'phosphor-pulse 4s ease-in-out infinite'
        }}
      />

      {/* Screen flicker */}
      <div
        className="absolute inset-0 pointer-events-none opacity-3 dark:opacity-5"
        style={{
          background: 'rgba(255,255,255,0.1)',
          animation: 'crt-flicker 0.15s infinite'
        }}
      />

      {/* Chromatic aberration simulation */}
      <div
        className="absolute inset-0 pointer-events-none opacity-3 dark:opacity-5"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(255,0,0,0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(0,255,0,0.1) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(0,0,255,0.1) 0%, transparent 60%)
          `,
          mixBlendMode: 'screen'
        }}
      />

      {/* CRT curvature distortion overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-40"
        style={{
          background: `
            radial-gradient(ellipse at center,
              transparent 50%,
              rgb(0 0 0 / 0.15) 85%,
              rgb(0 0 0 / 0.4) 100%
            )
          `
        }}
      />

      {/* Corner reflections */}
      <div
        className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-3 dark:opacity-5"
        style={{
          background: 'radial-gradient(circle at top right, rgba(255,255,255,0.3) 0%, transparent 70%)',
          filter: 'blur(20px)'
        }}
      />

      {/* Periodic glitch effects */}
      {isGlitching && (
        <>
          {/* RGB split glitch */}
          {glitchEffects.includes('rgb-split') && (
            <div
              className="absolute inset-0 pointer-events-none opacity-80 dark:opacity-100"
              style={{
                background: `
                  linear-gradient(90deg,
                    rgba(255,0,0,0.15) 0%,
                    transparent 2%,
                    transparent 98%,
                    rgba(0,255,0,0.15) 100%
                  )
                `,
                mixBlendMode: 'screen',
                animation: 'glitch-rgb 0.1s steps(2, end) infinite'
              }}
            />
          )}

          {/* Horizontal displacement lines */}
          {glitchEffects.includes('displacement') && (
            <div
              className="absolute inset-0 pointer-events-none opacity-70 dark:opacity-100"
              style={{
                backgroundImage: `
                  repeating-linear-gradient(0deg,
                    transparent 0px,
                    transparent ${Math.random() * 200 + 50}px,
                    rgba(255,107,53,0.3) ${Math.random() * 200 + 50}px,
                    rgba(255,107,53,0.3) ${Math.random() * 200 + 54}px
                  )
                `,
                animation: 'glitch-displacement 0.15s linear infinite',
                transform: `translateX(${Math.random() * 10 - 5}px)`
              }}
            />
          )}

          {/* Static noise overlay */}
          {glitchEffects.includes('static') && (
            <div
              className="absolute inset-0 pointer-events-none opacity-15 dark:opacity-20"
              style={{
                background: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" /></filter><rect width="200" height="200" filter="url(%23noise)" opacity="0.5"/></svg>')`,
                backgroundSize: '150px 150px',
                animation: 'static-noise 0.08s steps(8) infinite'
              }}
            />
          )}

          {/* Random scanline jumps */}
          {glitchEffects.includes('scanline') && (
            <div
              className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-40"
              style={{
                background: `
                  repeating-linear-gradient(0deg,
                    transparent 0px,
                    transparent ${Math.random() * 100 + 100}px,
                    rgb(0 0 0 / 0.8) ${Math.random() * 100 + 100}px,
                    rgb(0 0 0 / 0.8) ${Math.random() * 100 + 103}px
                  )
                `,
                animation: 'scanline-glitch 0.2s steps(6) infinite'
              }}
            />
          )}

          {/* Digital artifacts - blocky compression glitches */}
          {glitchEffects.includes('artifacts') && (
            <div
              className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-60"
              style={{
                backgroundImage: `
                  repeating-linear-gradient(0deg,
                    transparent 0px,
                    transparent ${Math.random() * 80 + 40}px,
                    rgba(255,0,255,0.15) ${Math.random() * 80 + 40}px,
                    rgba(255,0,255,0.15) ${Math.random() * 80 + 56}px,
                    transparent ${Math.random() * 80 + 56}px,
                    transparent ${Math.random() * 80 + 120}px,
                    rgba(0,255,255,0.12) ${Math.random() * 80 + 120}px,
                    rgba(0,255,255,0.12) ${Math.random() * 80 + 136}px
                  ),
                  repeating-linear-gradient(90deg,
                    transparent 0px,
                    transparent ${Math.random() * 60 + 30}px,
                    rgba(255,255,0,0.1) ${Math.random() * 60 + 30}px,
                    rgba(255,255,0,0.1) ${Math.random() * 60 + 46}px
                  )
                `,
                animation: 'digital-artifacts 0.12s steps(4) infinite',
                filter: 'blur(0.5px)'
              }}
            />
          )}

          {/* Macroblocking effect - larger blocky squares */}
          {glitchEffects.includes('macroblock') && (
            <div
              className="absolute inset-0 pointer-events-none opacity-25 dark:opacity-35"
              style={{
                backgroundImage: `
                  repeating-conic-gradient(from 90deg at 2px 2px,
                    rgba(0,0,0,0.2) 0deg,
                    rgba(0,0,0,0.2) 90deg,
                    rgba(255,107,53,0.15) 90deg,
                    rgba(255,107,53,0.15) 180deg,
                    rgba(236,72,153,0.15) 180deg,
                    rgba(236,72,153,0.15) 270deg,
                    rgba(0,0,0,0.2) 270deg
                  )
                `,
                backgroundSize: `${Math.random() * 40 + 30}px ${Math.random() * 40 + 30}px`,
                animation: 'macroblock-shift 0.1s steps(3) infinite'
              }}
            />
          )}

          {/* Pixel corruption - random colored dead/stuck pixels */}
          {glitchEffects.includes('pixel-corruption') && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60 dark:opacity-80" style={{ animation: 'pixel-flicker 0.08s steps(4) infinite' }}>
              <defs>
                <filter id="pixelCorruption">
                  <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" seed={Math.random() * 100} />
                  <feColorMatrix type="saturate" values="3" />
                  <feComponentTransfer>
                    <feFuncR type="discrete" tableValues={`${Math.random()} ${Math.random()} ${Math.random()} ${Math.random()}`} />
                    <feFuncG type="discrete" tableValues={`${Math.random()} ${Math.random()} ${Math.random()} ${Math.random()}`} />
                    <feFuncB type="discrete" tableValues={`${Math.random()} ${Math.random()} ${Math.random()} ${Math.random()}`} />
                    <feFuncA type="discrete" tableValues="0 0 0 0 1 0 0 1 0 0 1 0" />
                  </feComponentTransfer>
                </filter>
              </defs>
              <rect width="100%" height="100%" filter="url(#pixelCorruption)" opacity="0.6" />
            </svg>
          )}

          {/* Hot pixels - bright flickering single pixels */}
          {glitchEffects.includes('hot-pixels') && (
            <div
              className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-70"
              style={{
                backgroundImage: `
                  radial-gradient(circle at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(255,255,255,0.9) 0px, transparent 1px),
                  radial-gradient(circle at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(255,0,0,0.8) 0px, transparent 1px),
                  radial-gradient(circle at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(0,255,0,0.8) 0px, transparent 1px),
                  radial-gradient(circle at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(0,0,255,0.8) 0px, transparent 1px),
                  radial-gradient(circle at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(255,255,0,0.7) 0px, transparent 1px),
                  radial-gradient(circle at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(255,0,255,0.7) 0px, transparent 1px),
                  radial-gradient(circle at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(0,255,255,0.7) 0px, transparent 1px),
                  radial-gradient(circle at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(255,107,53,0.8) 0px, transparent 1px),
                  radial-gradient(circle at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(236,72,153,0.8) 0px, transparent 1px),
                  radial-gradient(circle at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(168,85,247,0.8) 0px, transparent 1px),
                  radial-gradient(circle at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(0,0,0,0.9) 0px, transparent 1px),
                  radial-gradient(circle at ${Math.random() * 100}% ${Math.random() * 100}%, rgba(255,255,255,0.9) 0px, transparent 1px)
                `,
                backgroundSize: '100% 100%',
                animation: 'hot-pixels 0.1s steps(6) infinite'
              }}
            />
          )}
        </>
      )}
      </div>
    </>
  )
}
