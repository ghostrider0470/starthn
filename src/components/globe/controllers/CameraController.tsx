// @ts-nocheck
import { useRef, MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { DataCenterMarker } from '@/data/worldGeography'
import type { ScrollData } from '../GlobeVisualization'

// ============================================================================
// ZOOM CONFIGURATION - Adjust these values to control camera zoom behavior
// ============================================================================
const ZOOM_CONFIG = {
  // Automatic zoom during scroll
  closeZoom: 6,      // Camera distance when focused on data center (lower = closer)
  farZoom: 8,        // Camera distance during transitions (higher = farther)

  // User manual zoom limits
  minDistance: 6,    // Closest user can zoom in
  maxDistance: 10,   // Farthest user can zoom out
}

// ============================================================================
// SMOOTHING CONFIGURATION
// ============================================================================
const SMOOTH_CONFIG = {
  // Position damping factor (lower = smoother but more lag, higher = snappier)
  positionDamping: 0.06,
  // Zoom damping factor
  zoomDamping: 0.08,
}
// ============================================================================

// Easing functions for smooth camera transitions
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

const easeOutQuart = (t: number): number =>
  1 - Math.pow(1 - t, 4)

export interface CameraControllerProps {
  focusDataCenter?: DataCenterMarker | null
  scrollDataRef?: MutableRefObject<ScrollData>
  enableUserControl?: boolean
  /** Enable smooth camera animations (can be disabled for reduced motion) */
  enableAnimation?: boolean
}

/**
 * Controls camera positioning, zoom, and elevation based on scroll.
 * Uses spherical coordinates to position camera at varying distances and elevations.
 * Reads scroll data from scrollDataRef (updated at 60fps via RAF) to smoothly
 * interpolate without triggering re-renders.
 *
 * Enhanced with easing functions and damping for fluid transitions.
 */
export function CameraController({
  focusDataCenter,
  scrollDataRef,
  enableUserControl = true,
  enableAnimation = true,
}: CameraControllerProps) {
  const { camera } = useThree()
  const controlsRef = useRef<any>()

  // Store target position for smooth interpolation
  const targetPosition = useRef(new THREE.Vector3(0, 0, 8))

  useFrame(() => {
    if (!controlsRef.current) return

    const time = performance.now() / 1000

    // Subtle idle drift — figure-8 pattern on the look target
    const idleX = Math.sin(time * 0.15) * 0.08
    const idleY = Math.cos(time * 0.1) * 0.05
    controlsRef.current.target.set(idleX, idleY, 0)

    // Get current data center coordinates from scroll data
    const fromDataCenter = scrollDataRef?.current?.fromDataCenter
    const toDataCenter = scrollDataRef?.current?.toDataCenter
    const progress = scrollDataRef?.current?.progress ?? 0

    if (!fromDataCenter || !toDataCenter) return

    // Apply easing to progress for smoother transitions
    const easedProgress = enableAnimation ? easeInOutCubic(progress) : progress

    // Interpolate lat/lng between data centers using eased progress
    const currentLat = fromDataCenter.lat + (toDataCenter.lat - fromDataCenter.lat) * easedProgress
    const currentLng = fromDataCenter.lng + (toDataCenter.lng - fromDataCenter.lng) * easedProgress

    // Zoom curve: zoom out during transition, then zoom back in
    // Use easeOutQuart for the zoom factor for a more dramatic effect
    const distanceFromCenter = Math.abs(easedProgress - 0.5)
    const normalizedDistance = distanceFromCenter * 2
    const zoomFactor = enableAnimation ? easeOutQuart(normalizedDistance) : normalizedDistance * normalizedDistance
    const currentDistance = ZOOM_CONFIG.farZoom - (ZOOM_CONFIG.farZoom - ZOOM_CONFIG.closeZoom) * zoomFactor

    // Calculate target camera position using spherical coordinates
    const phi = (90 - currentLat) * (Math.PI / 180)
    const theta = (currentLng + 180) * (Math.PI / 180)

    // Use EXACT same formula as latLngToVector3 from globe/utils.ts
    const targetX = -currentDistance * Math.sin(phi) * Math.cos(theta)
    const targetZ = currentDistance * Math.sin(phi) * Math.sin(theta)
    const targetY = currentDistance * Math.cos(phi)

    // Update target position
    targetPosition.current.set(targetX, targetY, targetZ)

    if (enableAnimation) {
      // Smooth interpolation with damping
      camera.position.x += (targetX - camera.position.x) * SMOOTH_CONFIG.positionDamping
      camera.position.y += (targetY - camera.position.y) * SMOOTH_CONFIG.positionDamping
      camera.position.z += (targetZ - camera.position.z) * SMOOTH_CONFIG.positionDamping
    } else {
      // Direct positioning for reduced motion
      camera.position.set(targetX, targetY, targetZ)
    }

    camera.lookAt(0, 0, 0)
    controlsRef.current.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, 0, 0]}
      enablePan={false}
      enableZoom={enableUserControl}
      enableRotate={enableUserControl}
      enableDamping={true}
      dampingFactor={0.05}
      rotateSpeed={1.0}
      zoomSpeed={1.0}
      minDistance={ZOOM_CONFIG.minDistance}
      maxDistance={ZOOM_CONFIG.maxDistance}
      autoRotate={false}
      maxPolarAngle={Math.PI}
      minPolarAngle={0}
    />
  )
}
