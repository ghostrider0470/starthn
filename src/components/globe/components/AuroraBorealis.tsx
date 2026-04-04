import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Aurora Borealis effect at the poles
 * - Swirling particle ribbons at north and south poles
 * - Gradient colors (purple, pink, cyan, green)
 * - Wavy, flowing motion like real auroras
 */
export function AuroraBorealis() {
  const northAuroraRef = useRef<THREE.Points>(null)
  const southAuroraRef = useRef<THREE.Points>(null)
  const frameCount = useRef(0)

  const particleCount = 400

  // Create aurora particles at poles — precompute random offsets to avoid per-frame Math.random()
  const [positions, colors, speeds, radiusOffsets] = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const speeds = new Float32Array(particleCount)
    const radiusOffsets = new Float32Array(particleCount)

    const auroraColors = [
      new THREE.Color('#a855f7'), // Purple
      new THREE.Color('#ec4899'), // Pink
      new THREE.Color('#06b6d4'), // Cyan
      new THREE.Color('#10b981'), // Green
    ]

    for (let i = 0; i < particleCount; i++) {
      // Position particles in a ring around the pole
      const angle = (i / particleCount) * Math.PI * 2
      const radius = 0.8 + Math.random() * 0.4
      const height = 0.3 + Math.random() * 0.2

      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = height
      positions[i * 3 + 2] = Math.sin(angle) * radius

      // Random color from aurora palette
      const color = auroraColors[Math.floor(Math.random() * auroraColors.length)]
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      // Random speed for wavy effect
      speeds[i] = 0.5 + Math.random() * 1.5

      // Precompute radius randomness
      radiusOffsets[i] = 0.8 + Math.random() * 0.4
    }

    return [positions, colors, speeds, radiusOffsets]
  }, [])

  useFrame((state) => {
    // Throttle to every other frame — halves CPU cost, no visible difference at 60fps
    frameCount.current++
    if (frameCount.current % 2 !== 0) return

    const time = state.clock.elapsedTime

    // Animate north aurora
    if (northAuroraRef.current) {
      const positions = northAuroraRef.current.geometry.attributes.position.array as Float32Array

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3
        const speed = speeds[i]

        // Wavy, flowing motion
        const angle = (i / particleCount) * Math.PI * 2
        const radius = radiusOffsets[i]
        const wave = Math.sin(time * speed + i * 0.1) * 0.3

        positions[i3] = Math.cos(angle + time * 0.1) * (radius + wave) * 2.1
        positions[i3 + 1] = (2.0 + wave * 0.5) * 2.1
        positions[i3 + 2] = Math.sin(angle + time * 0.1) * (radius + wave) * 2.1
      }

      northAuroraRef.current.geometry.attributes.position.needsUpdate = true
      northAuroraRef.current.rotation.y = time * 0.05
    }

    // Animate south aurora (opposite rotation)
    if (southAuroraRef.current) {
      const positions = southAuroraRef.current.geometry.attributes.position.array as Float32Array

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3
        const speed = speeds[i]

        const angle = (i / particleCount) * Math.PI * 2
        const radius = radiusOffsets[i]
        const wave = Math.sin(time * speed + i * 0.1) * 0.3

        positions[i3] = Math.cos(angle - time * 0.1) * (radius + wave) * 2.1
        positions[i3 + 1] = (-2.0 - wave * 0.5) * 2.1
        positions[i3 + 2] = Math.sin(angle - time * 0.1) * (radius + wave) * 2.1
      }

      southAuroraRef.current.geometry.attributes.position.needsUpdate = true
      southAuroraRef.current.rotation.y = -time * 0.05
    }
  })

  return (
    <group>
      {/* North Pole Aurora */}
      <points ref={northAuroraRef}>
        <bufferGeometry>
          {/* @ts-expect-error r3f bufferAttribute args */}

          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
          {/* @ts-expect-error r3f bufferAttribute args */}

          <bufferAttribute
            attach="attributes-color"
            count={particleCount}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          vertexColors
          transparent
          opacity={0.6}
          sizeAttenuation={true}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* South Pole Aurora */}
      <points ref={southAuroraRef}>
        <bufferGeometry>
          {/* @ts-expect-error r3f bufferAttribute args */}

          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions.slice()} // Clone array for south pole
            itemSize={3}
          />
          {/* @ts-expect-error r3f bufferAttribute args */}

          <bufferAttribute
            attach="attributes-color"
            count={particleCount}
            array={colors.slice()} // Clone colors
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          vertexColors
          transparent
          opacity={0.6}
          sizeAttenuation={true}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
