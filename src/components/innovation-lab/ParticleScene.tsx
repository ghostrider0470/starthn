import { Canvas } from '@react-three/fiber'
import { Particle } from './Particle'

interface FigureData {
  id: string
  r: number
  g: number
  b: number
  size: number
  shape: 'bug' | 'fish' | 'bird' | 'rabbit' | 'squirrel' | 'cat' | 'dog' | 'turtle' | 'snail'
  opacity: number
  alive: boolean
}

interface ParticleSceneProps {
  figures: FigureData[]
  onEliminate: (id: string) => void
  backgroundColor: { r: number; g: number; b: number }
}

export function ParticleScene({ figures, onEliminate, backgroundColor }: ParticleSceneProps) {
  // Convert background color to Three.js format
  const bgColor = `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`

  // Generate random positions for particles (scattered, not grid)
  const getPosition = (index: number): [number, number] => {
    // Use index as seed for consistent positions per creature
    const seed = index * 2654435761 % 2147483647
    const random1 = (Math.sin(seed) * 10000) % 1
    const random2 = (Math.sin(seed * 2) * 10000) % 1

    // Random position within bounds (-5 to 5 for x, -3 to 3 for y)
    const x = (Math.abs(random1) * 10) - 5
    const y = (Math.abs(random2) * 6) - 3

    return [x, y]
  }

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden">
      <Canvas
        orthographic
        camera={{
          zoom: 50,
          position: [0, 0, 10],
          near: 0.1,
          far: 1000,
        }}
        style={{
          background: bgColor,
          transition: 'background 500ms ease-in-out'
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />

        {/* Render all particles */}
        {figures.map((figure, index) => (
          <Particle
            key={figure.id}
            id={figure.id}
            position={getPosition(index)}
            r={figure.r}
            g={figure.g}
            b={figure.b}
            size={figure.size}
            shape={figure.shape}
            opacity={figure.opacity}
            alive={figure.alive}
            onEliminate={onEliminate}
          />
        ))}
      </Canvas>
    </div>
  )
}