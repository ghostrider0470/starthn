import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Starfield background - thousands of twinkling stars creating depth
 * - Multiple star layers at different distances
 * - Size and brightness variation
 * - Subtle twinkling animation
 * - Creates sense of vast space
 */
export function Starfield() {
  const starsRef = useRef<THREE.Points>(null)
  const distantStarsRef = useRef<THREE.Points>(null)

  // Near stars (3000 stars at medium distance)
  const nearStars = useMemo(() => {
    const count = 3000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const twinklePhases = new Float32Array(count)

    const starColors = [
      new THREE.Color('#ffffff'), // white
      new THREE.Color('#ffddcc'), // warm white
      new THREE.Color('#ccddff'), // cool blue-white
      new THREE.Color('#ffd4e5'), // subtle pink
      new THREE.Color('#e5d4ff'), // subtle purple
    ]

    for (let i = 0; i < count; i++) {
      // Random position in sphere
      const radius = 15 + Math.random() * 10
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      // Star color
      const baseColor = starColors[Math.floor(Math.random() * starColors.length)]
      const brightness = 0.6 + Math.random() * 0.4
      colors[i * 3] = baseColor.r * brightness
      colors[i * 3 + 1] = baseColor.g * brightness
      colors[i * 3 + 2] = baseColor.b * brightness

      // Star size (smaller stars more common)
      const sizeRoll = Math.random()
      if (sizeRoll > 0.95) {
        sizes[i] = 0.04 + Math.random() * 0.04 // Bright stars
      } else if (sizeRoll > 0.8) {
        sizes[i] = 0.025 + Math.random() * 0.025 // Medium stars
      } else {
        sizes[i] = 0.01 + Math.random() * 0.015 // Dim stars
      }

      // Random twinkle phase
      twinklePhases[i] = Math.random() * Math.PI * 2
    }

    return { positions, colors, sizes, twinklePhases }
  }, [])

  // Distant stars (2000 stars far away)
  const distantStars = useMemo(() => {
    const count = 2000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const twinklePhases = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Very distant stars
      const radius = 30 + Math.random() * 20
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      // Dimmer, cooler colors for distant stars
      const brightness = 0.3 + Math.random() * 0.3
      colors[i * 3] = brightness
      colors[i * 3 + 1] = brightness * 0.95
      colors[i * 3 + 2] = brightness * 1.1

      // Smaller sizes
      sizes[i] = 0.008 + Math.random() * 0.012

      twinklePhases[i] = Math.random() * Math.PI * 2
    }

    return { positions, colors, sizes, twinklePhases }
  }, [])

  // Animate twinkling
  useFrame((state) => {
    const time = state.clock.elapsedTime

    // Near stars twinkling
    if (starsRef.current) {
      const sizes = starsRef.current.geometry.attributes.size.array as Float32Array

      for (let i = 0; i < nearStars.sizes.length; i++) {
        const phase = nearStars.twinklePhases[i]
        const twinkle = Math.sin(time * 0.5 + phase) * 0.3 + 0.7
        sizes[i] = nearStars.sizes[i] * twinkle
      }

      starsRef.current.geometry.attributes.size.needsUpdate = true
    }

    // Distant stars twinkling (slower)
    if (distantStarsRef.current) {
      const sizes = distantStarsRef.current.geometry.attributes.size.array as Float32Array

      for (let i = 0; i < distantStars.sizes.length; i++) {
        const phase = distantStars.twinklePhases[i]
        const twinkle = Math.sin(time * 0.3 + phase) * 0.4 + 0.6
        sizes[i] = distantStars.sizes[i] * twinkle
      }

      distantStarsRef.current.geometry.attributes.size.needsUpdate = true
    }
  })

  return (
    <group>
      {/* Near stars */}
      <points ref={starsRef}>
        <bufferGeometry>
          {/* @ts-expect-error r3f bufferAttribute args */}
          <bufferAttribute
            attach="attributes-position"
            count={nearStars.positions.length / 3}
            array={nearStars.positions}
            itemSize={3}
          />
          {/* @ts-expect-error r3f bufferAttribute args */}
          <bufferAttribute
            attach="attributes-color"
            count={nearStars.colors.length / 3}
            array={nearStars.colors}
            itemSize={3}
          />
          {/* @ts-expect-error r3f bufferAttribute args */}
          <bufferAttribute
            attach="attributes-size"
            count={nearStars.sizes.length}
            array={nearStars.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.02}
          vertexColors
          transparent
          opacity={0.8}
          sizeAttenuation={true}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Distant stars */}
      <points ref={distantStarsRef}>
        <bufferGeometry>
          {/* @ts-expect-error r3f bufferAttribute args */}
          <bufferAttribute
            attach="attributes-position"
            count={distantStars.positions.length / 3}
            array={distantStars.positions}
            itemSize={3}
          />
          {/* @ts-expect-error r3f bufferAttribute args */}
          <bufferAttribute
            attach="attributes-color"
            count={distantStars.colors.length / 3}
            array={distantStars.colors}
            itemSize={3}
          />
          {/* @ts-expect-error r3f bufferAttribute args */}
          <bufferAttribute
            attach="attributes-size"
            count={distantStars.sizes.length}
            array={distantStars.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.01}
          vertexColors
          transparent
          opacity={0.6}
          sizeAttenuation={true}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  )
}
