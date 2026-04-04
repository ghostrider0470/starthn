import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import '@/components/globe/shaders'

interface EnhancedAtmosphereProps {
  /** Intensity multiplier (0-1), defaults to 1.0 */
  intensity?: number
  /** Number of atmosphere layers (1-3), defaults to 3 */
  layers?: number
}

/**
 * Multi-layered atmospheric glow with enhanced fresnel
 * - 3 atmosphere layers with gradient colors (purple → orange → pink)
 * - Synchronized pulsing across all layers
 * - Progressive fresnel power per layer
 * - Enhanced edge glow for dramatic effect
 * - Creates stunning depth perception
 */
export function EnhancedAtmosphere({ intensity = 1.0, layers = 3 }: EnhancedAtmosphereProps) {
  const layer1Ref = useRef<any>(null)
  const layer2Ref = useRef<any>(null)
  const layer3Ref = useRef<any>(null)

  useFrame((state) => {
    const time = state.clock.elapsedTime

    // Animate each atmosphere layer with different speeds and patterns
    // Layer 1: Inner core glow - faster pulse
    if (layer1Ref.current) {
      layer1Ref.current.time = time
      layer1Ref.current.intensity = (1.2 + Math.sin(time * 0.5) * 0.3) * intensity
    }

    // Layer 2: Mid atmosphere - medium pulse
    if (layer2Ref.current) {
      layer2Ref.current.time = time * 0.8
      layer2Ref.current.intensity = (1.0 + Math.sin(time * 0.6) * 0.2) * intensity
    }

    // Layer 3: Outer corona - slow breathe
    if (layer3Ref.current) {
      layer3Ref.current.time = time * 0.6
      layer3Ref.current.intensity = (0.8 + Math.sin(time * 0.4) * 0.15) * intensity
    }
  })

  return (
    <group>
      {/* Layer 1: Inner purple glow - closest to globe */}
      <mesh scale={[1.06, 1.06, 1.06]}>
        <sphereGeometry args={[2.008, 64, 64]} />
        {/* @ts-expect-error custom r3f material */}
          <atmosphereGlowMaterial
          ref={layer1Ref}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          glowColor="#a855f7"
          intensity={1.2}
        />
      </mesh>

      {/* Layer 2: Mid orange glow - creates warmth */}
      {layers >= 2 && (
        <mesh scale={[1.12, 1.12, 1.12]}>
          <sphereGeometry args={[2.008, 64, 64]} />
          {/* @ts-expect-error custom r3f material */}
          <atmosphereGlowMaterial
            ref={layer2Ref}
            transparent
            side={THREE.BackSide}
            depthWrite={false}
            glowColor="#ff6b35"
            intensity={1.0}
          />
        </mesh>
      )}

      {/* Layer 3: Outer pink corona - dramatic edge glow */}
      {layers >= 3 && (
        <mesh scale={[1.18, 1.18, 1.18]}>
          <sphereGeometry args={[2.008, 48, 48]} />
          {/* @ts-expect-error custom r3f material */}
          <atmosphereGlowMaterial
            ref={layer3Ref}
            transparent
            side={THREE.BackSide}
            depthWrite={false}
            glowColor="#ec4899"
            intensity={0.8}
          />
        </mesh>
      )}
    </group>
  )
}
