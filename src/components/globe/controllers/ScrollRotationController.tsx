import { MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { DataCenterMarker } from '@/data/worldGeography'
import type { ScrollData } from '../GlobeVisualization'

export interface ScrollRotationProps {
  groupRef: React.RefObject<THREE.Group>
  fromDataCenter?: DataCenterMarker | null
  toDataCenter?: DataCenterMarker | null
  scrollProgress?: number
  scrollDataRef?: MutableRefObject<ScrollData>
}

/**
 * REFACTORED: Keep globe stationary - camera orbits instead.
 * This hook is now a no-op since rotation is handled by CameraController.
 * Kept for backward compatibility.
 */
export function useScrollRotation({
}: ScrollRotationProps) {
  // No-op — camera orbits via CameraController, globe auto-rotates in Globe.tsx
}

/**
 * Standalone component version of scroll rotation controller
 * Can be used when you need a component rather than a hook
 */
export function ScrollRotationController(props: ScrollRotationProps) {
  useScrollRotation(props)
  return null
}
