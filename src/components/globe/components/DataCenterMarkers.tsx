import { useRef, useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DATA_CENTER_MARKERS, getDataCenterPosition, type DataCenterMarker } from '@/data/worldGeography'
import type { GlobeConfig } from '../GlobeVisualization'

// Simple deterministic hash for per-marker randomization
function markerHash(index: number, seed: number): number {
  const x = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453
  return x - Math.floor(x)
}

interface DataCenterMarkerProps {
  marker: DataCenterMarker
  index: number
}

/**
 * Lightweight data center marker — single solid dot
 * - Always visible, colored by provider (AWS/Azure/GCP)
 * - Random burst events scale the dot up briefly
 * - Hover: scale up, pointer cursor
 */
function DataCenterMarkerComponent({ marker, index }: DataCenterMarkerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const hoveredRef = useRef(false)
  const hoverScaleRef = useRef(1.0)
  const burstRef = useRef(0)
  const nextBurstRef = useRef(Math.random() * 5)

  const sizeScale = useMemo(() => 0.85 + markerHash(index, 6) * 0.3, [index])
  const burstInterval = useMemo(() => 2 + markerHash(index, 5) * 5, [index])

  // Color objects for lerping during bursts (HDR bright triggers bloom glow)
  const baseColor = useMemo(() => new THREE.Color(marker.color), [marker.color])
  const brightColor = useMemo(() => new THREE.Color(marker.color).multiplyScalar(5), [marker.color])
  const tmpColor = useMemo(() => new THREE.Color(), [])

  const onPointerOver = useCallback((e: any) => {
    e.stopPropagation()
    hoveredRef.current = true
    document.body.style.cursor = 'pointer'
  }, [])

  const onPointerOut = useCallback((e: any) => {
    e.stopPropagation()
    hoveredRef.current = false
    document.body.style.cursor = 'auto'
  }, [])

  useFrame((state) => {
    const time = state.clock.elapsedTime
    const dt = state.clock.getDelta()

    // Hover scale (smooth lerp)
    const targetScale = hoveredRef.current ? 1.8 : 1.0
    hoverScaleRef.current += (targetScale - hoverScaleRef.current) * 0.1
    if (groupRef.current) {
      const s = hoverScaleRef.current * sizeScale
      groupRef.current.scale.set(s, s, s)
    }

    // Burst events
    if (time > nextBurstRef.current) {
      burstRef.current = 1.0
      nextBurstRef.current = time + burstInterval * (0.5 + Math.random())
    }
    if (burstRef.current > 0) {
      burstRef.current = Math.max(0, burstRef.current - dt * 3.0)
    }

    // Scale + brighten dot on burst
    if (coreRef.current) {
      const s = 1.0 + burstRef.current * 0.5
      coreRef.current.scale.set(s, s, s)
      // Lerp color from base → HDR bright during burst (triggers bloom)
      const mat = coreRef.current.material as THREE.MeshBasicMaterial
      tmpColor.lerpColors(baseColor, brightColor, burstRef.current)
      mat.color.copy(tmpColor)
    }
  })

  const position = getDataCenterPosition(marker, 2.02)

  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      <mesh ref={coreRef} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
        <sphereGeometry args={[0.01, 6, 6]} />
        <meshBasicMaterial color={marker.color} toneMapped={false} />
      </mesh>
    </group>
  )
}

interface DataCenterMarkersProps {
  config: GlobeConfig
  isDark: boolean
}

export function DataCenterMarkers({ config }: DataCenterMarkersProps) {
  return (
    <>
      {DATA_CENTER_MARKERS.map((marker, index) => (
        <DataCenterMarkerComponent key={`marker-${index}`} marker={marker} index={index} />
      ))}
    </>
  )
}
