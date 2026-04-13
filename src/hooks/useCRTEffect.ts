import { useCallback, useEffect } from 'react'

export type CRTIntensity = 'subtle' | 'medium' | 'dramatic'

export type CRTEffectType =
  | 'rgb-split'
  | 'displacement'
  | 'static'
  | 'scanline'
  | 'artifacts'
  | 'macroblock'
  | 'pixel-corruption'
  | 'hot-pixels'

export interface CRTGlitchEvent {
  intensity: CRTIntensity
  effects?: CRTEffectType[]
  duration?: number
  sectionId?: string
}

// Effect presets by intensity
const INTENSITY_PRESETS: Record<CRTIntensity, CRTEffectType[]> = {
  subtle: ['scanline', 'static'],
  medium: ['rgb-split', 'displacement', 'scanline'],
  dramatic: ['rgb-split', 'displacement', 'static', 'artifacts', 'macroblock'],
}

function isDarkThemeActive(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

/**
 * Dispatch a CRT glitch event to the CRT overlay
 */
export function triggerCRTGlitch(options: CRTGlitchEvent): void {
  if (!isDarkThemeActive()) return

  const { intensity, effects, duration, sectionId } = options

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion) return

  const selectedEffects = effects || INTENSITY_PRESETS[intensity]

  window.dispatchEvent(
    new CustomEvent('crt-section-glitch', {
      detail: {
        intensity,
        effects: selectedEffects,
        duration: duration || (intensity === 'dramatic' ? 400 : intensity === 'medium' ? 300 : 200),
        sectionId,
      },
    })
  )
}

/**
 * Hook to trigger CRT effects when a section becomes visible
 */
export function useCRTEffect(options: {
  sectionId: string
  intensity?: CRTIntensity
  effects?: CRTEffectType[]
  triggerOnView?: boolean
  isInView?: boolean
}) {
  const { sectionId, intensity = 'medium', effects, triggerOnView = true, isInView = false } = options

  const trigger = useCallback(() => {
    triggerCRTGlitch({ intensity, effects, sectionId })
  }, [intensity, effects, sectionId])

  // Trigger on view if enabled
  useEffect(() => {
    if (triggerOnView && isInView) {
      // Small delay to let the section animate in first
      const timeout = setTimeout(trigger, 200)
      return () => clearTimeout(timeout)
    }
  }, [triggerOnView, isInView, trigger])

  return { trigger }
}

/**
 * Play a CRT sound effect (requires useCRTSound hook)
 */
export function playCRTSound(soundType: 'boot' | 'glitch' | 'type' | 'blip'): void {
  window.dispatchEvent(
    new CustomEvent('crt-sound', {
      detail: { soundType },
    })
  )
}
