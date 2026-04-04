import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Space background with Milky Way gradient and nebula clouds
 * - Gradient skybox creating depth
 * - Animated nebula particles in purple/orange
 * - Creates cosmic atmosphere
 */
export function SpaceBackground() {
  const nebulaRef = useRef<THREE.Points>(null)

  // Nebula cloud particles
  const nebula = useMemo(() => {
    const count = 800
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const velocities = new Float32Array(count * 3)

    const nebulaColors = [
      new THREE.Color('#a855f7'), // purple
      new THREE.Color('#ec4899'), // pink
      new THREE.Color('#ff6b35'), // orange
      new THREE.Color('#8b5cf6'), // violet
      new THREE.Color('#f59e0b'), // amber
    ]

    for (let i = 0; i < count; i++) {
      // Position in large sphere around scene
      const radius = 12 + Math.random() * 15
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      // Nebula color with transparency
      const baseColor = nebulaColors[Math.floor(Math.random() * nebulaColors.length)]
      const intensity = 0.3 + Math.random() * 0.4
      colors[i * 3] = baseColor.r * intensity
      colors[i * 3 + 1] = baseColor.g * intensity
      colors[i * 3 + 2] = baseColor.b * intensity

      // Large, soft particles
      sizes[i] = 0.5 + Math.random() * 1.5

      // Slow drift velocity
      velocities[i * 3] = (Math.random() - 0.5) * 0.002
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.002
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002
    }

    return { positions, colors, sizes, velocities }
  }, [])

  // Milky Way gradient sphere (very large, behind everything)
  const milkyWayTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 1024
    const ctx = canvas.getContext('2d')!

    // Create gradient from top to bottom
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)

    // Deep space colors
    gradient.addColorStop(0, '#0a0118') // Dark purple at top
    gradient.addColorStop(0.3, '#1a0b2e') // Deep purple-blue
    gradient.addColorStop(0.5, '#2d1b4e') // Mid purple with Milky Way band
    gradient.addColorStop(0.7, '#1f0f2e') // Darker purple below
    gradient.addColorStop(1, '#0d0415') // Very dark at bottom

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Add Milky Way band (horizontal glow across middle)
    const milkyWayGradient = ctx.createLinearGradient(0, canvas.height * 0.4, 0, canvas.height * 0.6)
    milkyWayGradient.addColorStop(0, 'rgba(138, 92, 246, 0)')
    milkyWayGradient.addColorStop(0.5, 'rgba(138, 92, 246, 0.15)')
    milkyWayGradient.addColorStop(1, 'rgba(138, 92, 246, 0)')

    ctx.fillStyle = milkyWayGradient
    ctx.fillRect(0, canvas.height * 0.4, canvas.width, canvas.height * 0.2)

    // Add subtle orange tint on one side
    const orangeGradient = ctx.createRadialGradient(
      canvas.width * 0.7, canvas.height * 0.5, 0,
      canvas.width * 0.7, canvas.height * 0.5, canvas.width * 0.4
    )
    orangeGradient.addColorStop(0, 'rgba(255, 107, 53, 0.08)')
    orangeGradient.addColorStop(1, 'rgba(255, 107, 53, 0)')

    ctx.fillStyle = orangeGradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Add random stars to Milky Way band
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * canvas.width
      const y = canvas.height * 0.4 + Math.random() * (canvas.height * 0.2)
      const size = Math.random() * 2
      ctx.fillRect(x, y, size, size)
    }

    return new THREE.CanvasTexture(canvas)
  }, [])

  // Animate nebula clouds
  useFrame(() => {
    if (nebulaRef.current) {
      const positions = nebulaRef.current.geometry.attributes.position.array as Float32Array

      for (let i = 0; i < nebula.positions.length / 3; i++) {
        positions[i * 3] += nebula.velocities[i * 3]
        positions[i * 3 + 1] += nebula.velocities[i * 3 + 1]
        positions[i * 3 + 2] += nebula.velocities[i * 3 + 2]

        // Keep particles within bounds
        const distance = Math.sqrt(
          positions[i * 3] ** 2 +
          positions[i * 3 + 1] ** 2 +
          positions[i * 3 + 2] ** 2
        )

        if (distance > 30 || distance < 10) {
          // Reset to original position
          positions[i * 3] = nebula.positions[i * 3]
          positions[i * 3 + 1] = nebula.positions[i * 3 + 1]
          positions[i * 3 + 2] = nebula.positions[i * 3 + 2]
        }
      }

      nebulaRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <group>
      {/* Milky Way gradient skybox - very large sphere behind everything */}
      <mesh>
        <sphereGeometry args={[80, 32, 32]} />
        <meshBasicMaterial
          map={milkyWayTexture}
          side={THREE.BackSide}
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>

      {/* Nebula cloud particles */}
      <points ref={nebulaRef}>
        <bufferGeometry>
          {/* @ts-expect-error r3f bufferAttribute args */}
          <bufferAttribute
            attach="attributes-position"
            count={nebula.positions.length / 3}
            array={nebula.positions}
            itemSize={3}
          />
          {/* @ts-expect-error r3f bufferAttribute args */}
          <bufferAttribute
            attach="attributes-color"
            count={nebula.colors.length / 3}
            array={nebula.colors}
            itemSize={3}
          />
          {/* @ts-expect-error r3f bufferAttribute args */}
          <bufferAttribute
            attach="attributes-size"
            count={nebula.sizes.length}
            array={nebula.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={1.0}
          vertexColors
          transparent
          opacity={0.25}
          sizeAttenuation={true}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  )
}
