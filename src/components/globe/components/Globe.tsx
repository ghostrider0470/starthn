import { useRef, useState, useEffect, useMemo, MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createContinentGeometriesByRegion, createEnhancedWireframeGeometry, createCountryBordersGeometry, CONTINENT_COLORS, type DataCenterMarker } from '@/data/globe'
import { createContinentFillTexture } from '@/data/globe/geometry/fills'
import { useScrollRotation } from '@/components/globe/controllers/ScrollRotationController'
import { useIsDarkMode } from '@/hooks/useIsDarkMode'
import { DataCenterMarkers } from './DataCenterMarkers'
import { DataConnections } from './DataConnections'
import { EnhancedAtmosphere } from './EnhancedAtmosphere'
import { AuroraBorealis } from './AuroraBorealis'
import type { GlobeConfig, ScrollData } from '../GlobeVisualization'
import '@/components/globe/shaders'

// Theme-dependent colors
// Light mode uses saturated professional blues that read cleanly over bright surfaces.
const OCEAN_DARK = '#0a0a1a'
const OCEAN_LIGHT = '#1f4f86'
const WIREFRAME_DARK = '#ff6b35'
const WIREFRAME_LIGHT = '#f97316'
const BORDER_DARK = '#ec4899'
const BORDER_LIGHT = '#fb7185'

interface GlobeProps {
  config: GlobeConfig
  fromDataCenter?: DataCenterMarker | null
  toDataCenter?: DataCenterMarker | null
  scrollProgress?: number
  scrollDataRef?: MutableRefObject<ScrollData>
}

export function Globe({ config, fromDataCenter, toDataCenter, scrollProgress, scrollDataRef }: GlobeProps) {
  const meshRef = useRef<THREE.Group>(null!)
  const materialRef = useRef<any>(null)
  const [continentCoastlines, setContinentCoastlines] = useState<{[key: string]: THREE.BufferGeometry}>({})
  const [countryBorders, setCountryBorders] = useState<THREE.BufferGeometry | null>(null)
  const [fillTexture, setFillTexture] = useState<THREE.CanvasTexture | null>(null)
  const isDark = useIsDarkMode()

  const wireframeGeometry = useMemo(() => createEnhancedWireframeGeometry(), [])

  // Use scroll rotation controller
  useScrollRotation({
    groupRef: meshRef,
    fromDataCenter,
    toDataCenter,
    scrollProgress,
    scrollDataRef
  })

  // Load coastlines + borders once (theme-independent)
  useEffect(() => {
    Promise.all([
      createContinentGeometriesByRegion(),
      createCountryBordersGeometry(),
    ]).then(([coastlines, borders]) => {
      setContinentCoastlines(coastlines)
      setCountryBorders(borders)
    }).catch(err => {
      console.error('Failed to load globe data:', err)
    })
  }, [])

  // Rebuild fill texture when theme changes
  useEffect(() => {
    createContinentFillTexture(isDark).then(texture => {
      if (texture) setFillTexture(texture)
    })
  }, [isDark])

  useFrame((state) => {
    const time = state.clock.elapsedTime

    // Slow auto-rotation: ~1 full rotation per 2 minutes
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0008
    }

    // Update shader uniforms
    if (materialRef.current) {
      materialRef.current.time = time
    }
  })

  return (
    <group ref={meshRef}>
      {/* Ocean layer - opaque sphere, renders first to fill depth buffer */}
      <mesh renderOrder={-1}>
        <sphereGeometry args={[1.998, 64, 64]} />
        <meshBasicMaterial
          color={isDark ? OCEAN_DARK : OCEAN_LIGHT}
          depthTest={true}
          depthWrite={true}
        />
      </mesh>

      {/* Continent fills - textured sphere just above ocean */}
      {fillTexture && (
        <mesh renderOrder={0}>
          <sphereGeometry args={[2.003, 64, 64]} />
          <meshBasicMaterial
            map={fillTexture}
            transparent
            opacity={isDark ? 0.75 : 0.6}
            toneMapped={false}
            depthWrite={false}
            depthTest={true}
          />
        </mesh>
      )}

      {/* Lat/lng grid wireframe layer - warm orange glow */}
      <lineSegments geometry={wireframeGeometry} renderOrder={1}>
        {/* @ts-expect-error custom r3f material */}
          <wireframeGlowMaterial
          ref={materialRef}
          transparent
          color={isDark ? WIREFRAME_DARK : WIREFRAME_LIGHT}
          glowIntensity={isDark ? 0.6 : 0.7}
          depthTest={true}
        />
      </lineSegments>

      {/* Data center markers with pulsing animation */}
      <DataCenterMarkers config={config} isDark={isDark} />

      {/* Connection lines between data centers */}
      {config.showConnections && <DataConnections config={config} />}

      {/* Continent coastlines - thick colored borders */}
      {Object.entries(continentCoastlines).map(([continentName, geometry]) => {
        const color = CONTINENT_COLORS[continentName as keyof typeof CONTINENT_COLORS] || '#a855f7'

        return (
          <lineSegments key={`coastline-${continentName}`} geometry={geometry}>
            <lineBasicMaterial
              color={color}
              transparent
              opacity={0.9}
              linewidth={3}
              toneMapped={false}
            />
          </lineSegments>
        )
      })}

      {/* Country borders - subtle lines */}
      {countryBorders && (
        <lineSegments geometry={countryBorders}>
          <lineBasicMaterial
            color={isDark ? BORDER_DARK : BORDER_LIGHT}
            transparent
            opacity={isDark ? 0.4 : 0.5}
            linewidth={1}
            toneMapped={false}
          />
        </lineSegments>
      )}

      {/* Multi-layered atmosphere with gradient colors - layers based on performance tier */}
      <EnhancedAtmosphere layers={config.atmosphereLayers ?? 3} intensity={isDark ? 1.0 : 0.8} />

      {/* Aurora borealis at poles - conditional based on performance tier */}
      {isDark && config.showAurora && <AuroraBorealis />}
    </group>
  )
}
