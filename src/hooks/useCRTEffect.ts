// CRT effect hook — no-op retained for import compatibility

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

/** No-op: CRT effects have been removed */
export function triggerCRTGlitch(_options: CRTGlitchEvent): void {
  // no-op
}

/** No-op hook: CRT effects have been removed */
export function useCRTEffect(_options: {
  sectionId: string
  intensity?: CRTIntensity
  effects?: CRTEffectType[]
  triggerOnView?: boolean
  isInView?: boolean
}) {
  return { trigger: () => {} }
}

/** No-op: CRT effects have been removed */
export function playCRTSound(_soundType: 'boot' | 'glitch' | 'type' | 'blip'): void {
  // no-op
}
