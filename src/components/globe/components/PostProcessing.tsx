// @ts-nocheck
import { Component, ErrorInfo, ReactNode } from 'react'
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import { BlendFunction, KernelSize } from 'postprocessing'
import * as THREE from 'three'
import { useIsDarkMode } from '@/hooks/useIsDarkMode'

/**
 * Error boundary specifically for post-processing effects
 * Prevents WebGL context loss from crashing the entire scene
 */
class PostProcessingErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('PostProcessing error (non-critical):', error.message)
    // Don't render post-processing if it fails - scene will still work without it
  }

  render() {
    if (this.state.hasError) {
      // Return null to render scene without post-processing
      return null
    }
    return this.props.children
  }
}

interface PostProcessingEffectsProps {
  /** Intensity multiplier for all effects (0-1), defaults to 1.0 */
  intensity?: number
  /** Whether to enable chromatic aberration (only high tier) */
  showChromaticAberration?: boolean
}

/**
 * Post-processing effects for breathtaking cinematic visuals
 * - Bloom: HDR glow on all neon elements (enhanced for dramatic effect)
 * - Chromatic Aberration: Subtle color separation at edges
 * - Vignette: Draws focus to center
 */
function PostProcessingEffects({ intensity = 1.0, showChromaticAberration = false }: PostProcessingEffectsProps) {
  const isDark = useIsDarkMode()

  // Light mode: keep bloom strong, skip vignette (dark edges look wrong on white)
  const bloomIntensity = isDark ? 2.0 : 1.8
  const vignetteEnabled = isDark

  return (
    <EffectComposer
      multisampling={0}
      frameBufferType={THREE.HalfFloatType}
    >
      {/* Bloom Effect - Dramatic glow with wider spread */}
      <Bloom
        intensity={bloomIntensity * intensity}
        luminanceThreshold={isDark ? 0.3 : 0.35}
        luminanceSmoothing={0.95}
        kernelSize={KernelSize.MEDIUM}
        mipmapBlur={true}
      />

      {/* Chromatic Aberration - Subtle CRT feel (high tier only) */}
      {showChromaticAberration && (
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.002 * intensity, 0.002 * intensity)}
        />
      )}

      {/* Vignette - Edge darkening (dark mode only) */}
      {vignetteEnabled && (
        <Vignette
          offset={0.25}
          darkness={0.7 * intensity}
          eskil={false}
          blendFunction={BlendFunction.NORMAL}
        />
      )}
    </EffectComposer>
  )
}

export interface PostProcessingProps {
  /** Intensity multiplier for all effects (0-1), defaults to 1.0 */
  intensity?: number
  /** Whether to enable chromatic aberration (only high tier) */
  showChromaticAberration?: boolean
}

export function PostProcessing({ intensity = 1.0, showChromaticAberration = false }: PostProcessingProps) {
  return (
    <PostProcessingErrorBoundary>
      <PostProcessingEffects intensity={intensity} showChromaticAberration={showChromaticAberration} />
    </PostProcessingErrorBoundary>
  )
}
