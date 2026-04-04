import { useMemo } from 'react'
import { useResponsiveLayout } from './useResponsiveLayout'
import { useReducedMotion } from './useReducedMotion'

export type PerformanceTier = 'low' | 'medium' | 'high'

export interface GlobePerformanceConfig {
  /** Enable post-processing effects (bloom, chromatic aberration) */
  showPostProcessing: boolean
  /** Enable chromatic aberration post-processing (subtle, only high tier) */
  showChromaticAberration: boolean
  /** Enable aurora borealis effect */
  showAurora: boolean
  /** Number of data connections to show */
  connectionCount: number
  /** Number of orbiting particles */
  particleCount: number
  /** Number of atmosphere layers */
  atmosphereLayers: number
  /** Device pixel ratio cap */
  dpr: number
  /** Enable space background with stars */
  showSpaceBackground: boolean
  /** Enable smooth camera animations */
  enableCameraAnimation: boolean
}

const tierConfigs: Record<PerformanceTier, GlobePerformanceConfig> = {
  low: {
    showPostProcessing: false,
    showChromaticAberration: false,
    showAurora: false,
    connectionCount: 20,
    particleCount: 30,
    atmosphereLayers: 1,
    dpr: 1,
    showSpaceBackground: false,
    enableCameraAnimation: true,
  },
  medium: {
    showPostProcessing: true,
    showChromaticAberration: false,
    showAurora: true,
    connectionCount: 35,
    particleCount: 50,
    atmosphereLayers: 2,
    dpr: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5),
    showSpaceBackground: false,  // Disabled - globe is now an overlay
    enableCameraAnimation: true,
  },
  high: {
    showPostProcessing: true,
    showChromaticAberration: true,
    showAurora: true,
    connectionCount: 50,
    particleCount: 100,
    atmosphereLayers: 3,
    dpr: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2),
    showSpaceBackground: false,  // Disabled - globe is now an overlay
    enableCameraAnimation: true,
  },
}

interface UseGlobePerformanceTierResult {
  tier: PerformanceTier
  config: GlobePerformanceConfig
}

/**
 * Determines the appropriate performance tier for the globe based on:
 * - Screen size (tablet = low, desktop = medium, xl = high)
 * - Reduced motion preference (forces low tier)
 */
export function useGlobePerformanceTier(): UseGlobePerformanceTierResult {
  const layout = useResponsiveLayout()
  const prefersReducedMotion = useReducedMotion()

  const tier = useMemo<PerformanceTier>(() => {
    // Reduced motion always gets low tier
    if (prefersReducedMotion) return 'low'

    // Map screen size to performance tier
    switch (layout.screenSize) {
      case 'mobile':
        return 'low'
      case 'tablet':
        return 'low'
      case 'desktop':
        return 'medium'
      case 'xl':
        return 'high'
      default:
        return 'medium'
    }
  }, [layout.screenSize, prefersReducedMotion])

  const config = useMemo(() => {
    const baseConfig = tierConfigs[tier]

    // If reduced motion, disable camera animation even for higher tiers
    if (prefersReducedMotion) {
      return {
        ...baseConfig,
        enableCameraAnimation: false,
      }
    }

    return baseConfig
  }, [tier, prefersReducedMotion])

  return { tier, config }
}
