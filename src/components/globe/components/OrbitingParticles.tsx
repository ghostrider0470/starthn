import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Module-level reusable objects to avoid per-frame GC pressure
const _tmpColor = new THREE.Color()
const _topColor = new THREE.Color('#a855f7')
const _bottomColor = new THREE.Color('#ff6b35')
const _shiftedColor = new THREE.Color()

/**
 * Dynamic multi-layered particle system - living, breathing cloud
 * - 3 layers at different distances and speeds (near, mid, far)
 * - Size variation based on importance
 * - Particle trails creating shooting star effects
 * - Occasional bright flashes simulating data bursts
 * - Color shifts based on position and activity
 */

interface ParticleLayer {
  ref: React.RefObject<THREE.Points>
  trailRef: React.RefObject<THREE.Points>
  count: number
  radiusMin: number
  radiusMax: number
  speed: number
  sizeMin: number
  sizeMax: number
  name: string
}

interface OrbitingParticlesProps {
  /** Total particle count (distributed across layers). Defaults to 100. */
  count?: number
}

export function OrbitingParticles({ count = 100 }: OrbitingParticlesProps) {
  // Three distinct particle layers
  const nearLayerRef = useRef<THREE.Points>(null!)
  const nearTrailRef = useRef<THREE.Points>(null!)
  const midLayerRef = useRef<THREE.Points>(null!)
  const midTrailRef = useRef<THREE.Points>(null!)
  const farLayerRef = useRef<THREE.Points>(null!)
  const farTrailRef = useRef<THREE.Points>(null!)

  // Scale particle counts based on total count (100 = default/high, 50 = medium, 0 = off)
  const scale = count / 100
  const layers: ParticleLayer[] = useMemo(() => [
    {
      ref: nearLayerRef,
      trailRef: nearTrailRef,
      count: Math.max(1, Math.round(80 * scale)),
      radiusMin: 2.5,
      radiusMax: 3.0,
      speed: 0.15,
      sizeMin: 0.03,
      sizeMax: 0.06,
      name: 'near'
    },
    {
      ref: midLayerRef,
      trailRef: midTrailRef,
      count: Math.max(1, Math.round(120 * scale)),
      radiusMin: 3.0,
      radiusMax: 4.0,
      speed: 0.1,
      sizeMin: 0.025,
      sizeMax: 0.05,
      name: 'mid'
    },
    {
      ref: farLayerRef,
      trailRef: farTrailRef,
      count: Math.max(1, Math.round(100 * scale)),
      radiusMin: 4.0,
      radiusMax: 5.5,
      speed: 0.05,
      sizeMin: 0.02,
      sizeMax: 0.045,
      name: 'far'
    }
  ], [scale])

  // Generate particle data for each layer
  const layerData = useMemo(() => {
    return layers.map(layer => {
      const positions = new Float32Array(layer.count * 3)
      const colors = new Float32Array(layer.count * 3)
      const sizes = new Float32Array(layer.count)
      const speeds = new Float32Array(layer.count)
      const phases = new Float32Array(layer.count) // For burst timing
      const importance = new Float32Array(layer.count) // For size/brightness variation

      // Trail data (5 trail particles per main particle)
      const trailPositions = new Float32Array(layer.count * 5 * 3)
      const trailColors = new Float32Array(layer.count * 5 * 3)
      const trailSizes = new Float32Array(layer.count * 5)

      const particleColors = [
        new THREE.Color('#ff6b35'), // vibrant orange
        new THREE.Color('#ec4899'), // hot pink
        new THREE.Color('#a855f7'), // purple
        new THREE.Color('#f59e0b'), // amber
        new THREE.Color('#06b6d4'), // cyan
        new THREE.Color('#10b981'), // green
      ]

      for (let i = 0; i < layer.count; i++) {
        // Random position on sphere with varying radius
        const radius = layer.radiusMin + Math.random() * (layer.radiusMax - layer.radiusMin)
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
        positions[i * 3 + 2] = radius * Math.cos(phi)

        // Importance factor (0.3 to 1.0) - affects size and brightness
        const imp = 0.3 + Math.random() * 0.7
        importance[i] = imp

        // Size based on importance
        sizes[i] = layer.sizeMin + (layer.sizeMax - layer.sizeMin) * imp

        // Individual speed variation
        speeds[i] = 0.5 + Math.random() * 1.5

        // Random phase for burst timing
        phases[i] = Math.random() * Math.PI * 2

        // Color selection with slight variation
        const baseColor = particleColors[Math.floor(Math.random() * particleColors.length)]
        const colorVariation = 0.8 + Math.random() * 0.4 // 80% to 120% brightness
        colors[i * 3] = baseColor.r * colorVariation
        colors[i * 3 + 1] = baseColor.g * colorVariation
        colors[i * 3 + 2] = baseColor.b * colorVariation

        // Initialize trail particles
        for (let j = 0; j < 5; j++) {
          const idx = (i * 5 + j) * 3
          trailPositions[idx] = positions[i * 3]
          trailPositions[idx + 1] = positions[i * 3 + 1]
          trailPositions[idx + 2] = positions[i * 3 + 2]

          trailColors[idx] = colors[i * 3]
          trailColors[idx + 1] = colors[i * 3 + 1]
          trailColors[idx + 2] = colors[i * 3 + 2]

          // Trail particles are smaller and fade
          trailSizes[i * 5 + j] = sizes[i] * (1 - j * 0.15)
        }
      }

      return {
        positions,
        colors,
        sizes,
        speeds,
        phases,
        importance,
        trailPositions,
        trailColors,
        trailSizes
      }
    })
  }, [layers])

  const frameCount = useRef(0)

  useFrame((state) => {
    // Throttle to every other frame — ambient effect, no visible difference at 60fps
    frameCount.current++
    if (frameCount.current % 2 !== 0) return

    const time = state.clock.elapsedTime

    layers.forEach((layer, layerIdx) => {
      const data = layerData[layerIdx]

      if (layer.ref.current) {
        const particleGeo = layer.ref.current.geometry
        const positions = particleGeo.attributes.position.array as Float32Array
        const colors = particleGeo.attributes.color.array as Float32Array
        const sizes = particleGeo.attributes.size.array as Float32Array

        // Update main particles
        for (let i = 0; i < layer.count; i++) {
          const i3 = i * 3

          // Get base position
          const baseX = data.positions[i3]
          const baseY = data.positions[i3 + 1]
          const baseZ = data.positions[i3 + 2]

          // Rotate particles
          const rotationSpeed = time * layer.speed * data.speeds[i]
          const cosRot = Math.cos(rotationSpeed)
          const sinRot = Math.sin(rotationSpeed)

          positions[i3] = baseX * cosRot - baseZ * sinRot
          positions[i3 + 1] = baseY + Math.sin(time * 0.5 + i * 0.1) * 0.1
          positions[i3 + 2] = baseX * sinRot + baseZ * cosRot

          // Color shifts based on position (height-based gradient)
          const heightFactor = (positions[i3 + 1] + 5) / 10 // 0 to 1
          _tmpColor.setRGB(
            data.colors[i3],
            data.colors[i3 + 1],
            data.colors[i3 + 2]
          )

          // Shift color based on height (purple at top, orange at bottom)
          _shiftedColor.lerpColors(_bottomColor, _topColor, heightFactor)

          // Blend base color with position-based color
          colors[i3] = _tmpColor.r * 0.7 + _shiftedColor.r * 0.3
          colors[i3 + 1] = _tmpColor.g * 0.7 + _shiftedColor.g * 0.3
          colors[i3 + 2] = _tmpColor.b * 0.7 + _shiftedColor.b * 0.3

          // Occasional bright flashes (data bursts)
          const burstPhase = data.phases[i]
          const burstTime = Math.sin(time * 2.0 + burstPhase)
          const isBursting = burstTime > 0.95 // 5% of time

          if (isBursting) {
            // Bright flash
            const flashIntensity = (burstTime - 0.95) * 20 // 0 to 1
            colors[i3] = Math.min(1, colors[i3] + flashIntensity)
            colors[i3 + 1] = Math.min(1, colors[i3 + 1] + flashIntensity)
            colors[i3 + 2] = Math.min(1, colors[i3 + 2] + flashIntensity)

            // Larger size during burst
            sizes[i] = data.sizes[i] * (1 + flashIntensity * 0.5)
          } else {
            // Normal size with subtle pulse
            const pulse = Math.sin(time * 3.0 + i * 0.5) * 0.1 + 1
            sizes[i] = data.sizes[i] * pulse
          }
        }

        particleGeo.attributes.position.needsUpdate = true
        particleGeo.attributes.color.needsUpdate = true
        particleGeo.attributes.size.needsUpdate = true
      }

      // Update trail particles (shooting star effect)
      if (layer.trailRef.current) {
        const trailGeo = layer.trailRef.current.geometry
        const trailPositions = trailGeo.attributes.position.array as Float32Array

        for (let i = 0; i < layer.count; i++) {
          for (let j = 0; j < 5; j++) {
            const idx = (i * 5 + j) * 3
            const mainIdx = i * 3

            // Trail lags behind main particle
            const lagFactor = j * 0.08
            const lagTime = time - lagFactor
            const rotSpeed = lagTime * layer.speed * data.speeds[i]
            const cosRot = Math.cos(rotSpeed)
            const sinRot = Math.sin(rotSpeed)

            const baseX = data.positions[mainIdx]
            const baseY = data.positions[mainIdx + 1]
            const baseZ = data.positions[mainIdx + 2]

            trailPositions[idx] = baseX * cosRot - baseZ * sinRot
            trailPositions[idx + 1] = baseY + Math.sin(lagTime * 0.5 + i * 0.1) * 0.1
            trailPositions[idx + 2] = baseX * sinRot + baseZ * cosRot
          }
        }

        trailGeo.attributes.position.needsUpdate = true
      }
    })
  })

  return (
    <group>
      {layers.map((layer, idx) => {
        const data = layerData[idx]
        return (
          <group key={layer.name}>
            {/* Main particles */}
            <points ref={layer.ref}>
              <bufferGeometry>
                {/* @ts-expect-error r3f bufferAttribute args */}

                <bufferAttribute
                  attach="attributes-position"
                  count={layer.count}
                  array={data.positions}
                  itemSize={3}
                />
                {/* @ts-expect-error r3f bufferAttribute args */}

                <bufferAttribute
                  attach="attributes-color"
                  count={layer.count}
                  array={data.colors}
                  itemSize={3}
                />
                {/* @ts-expect-error r3f bufferAttribute args */}

                <bufferAttribute
                  attach="attributes-size"
                  count={layer.count}
                  array={data.sizes}
                  itemSize={1}
                />
              </bufferGeometry>
              <pointsMaterial
                size={0.03}
                vertexColors
                transparent
                opacity={0.9}
                sizeAttenuation={true}
                blending={THREE.AdditiveBlending}
              />
            </points>

            {/* Trail particles (shooting stars) */}
            <points ref={layer.trailRef}>
              <bufferGeometry>
                {/* @ts-expect-error r3f bufferAttribute args */}

                <bufferAttribute
                  attach="attributes-position"
                  count={layer.count * 5}
                  array={data.trailPositions}
                  itemSize={3}
                />
                {/* @ts-expect-error r3f bufferAttribute args */}

                <bufferAttribute
                  attach="attributes-color"
                  count={layer.count * 5}
                  array={data.trailColors}
                  itemSize={3}
                />
                {/* @ts-expect-error r3f bufferAttribute args */}

                <bufferAttribute
                  attach="attributes-size"
                  count={layer.count * 5}
                  array={data.trailSizes}
                  itemSize={1}
                />
              </bufferGeometry>
              <pointsMaterial
                size={0.02}
                vertexColors
                transparent
                opacity={0.4}
                sizeAttenuation={true}
                blending={THREE.AdditiveBlending}
              />
            </points>
          </group>
        )
      })}
    </group>
  )
}
