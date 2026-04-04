import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Bug, Fish, Bird, Rabbit, Squirrel, Cat, Dog, Turtle, Snail } from 'lucide-react'

interface ParticleProps {
  id: string
  position: [number, number]
  r: number
  g: number
  b: number
  size: number
  shape: 'bug' | 'fish' | 'bird' | 'rabbit' | 'squirrel' | 'cat' | 'dog' | 'turtle' | 'snail'
  opacity: number
  alive: boolean
  onEliminate: (id: string) => void
}

// Icon mapping for different animal shapes
const ICON_MAP = {
  bug: Bug,
  fish: Fish,
  bird: Bird,
  rabbit: Rabbit,
  squirrel: Squirrel,
  cat: Cat,
  dog: Dog,
  turtle: Turtle,
  snail: Snail,
} as const

export function Particle({ id, position, r, g, b, size, shape, opacity, alive, onEliminate }: ParticleProps) {
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  const [scale, setScale] = useState(size)

  // Fade out animation when clicked
  useFrame(() => {
    if (!clicked) return
    setScale(prev => prev * 0.95)
  })

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!alive || clicked) return
    setClicked(true)
    setTimeout(() => onEliminate(id), 300)
  }

  if (!alive && !clicked) return null
  if (scale < 0.01) return null

  const color = `rgb(${r}, ${g}, ${b})`
  const Icon = ICON_MAP[shape]
  const displayScale = hovered ? size * 1.15 : size

  return (
    <Html
      position={[position[0], position[1], 0]}
      center
      style={{
        transition: 'none',
        pointerEvents: alive ? 'auto' : 'none',
      }}
    >
      <button
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="cursor-pointer hover:drop-shadow-lg transition-all"
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          transform: `scale(${clicked ? scale : displayScale})`,
          opacity: clicked ? Math.max(0, scale / size) : 1,
          transition: clicked ? 'opacity 300ms ease-out, transform 300ms ease-out' : 'transform 100ms ease-out',
        }}
        aria-label={`Particle ${id}`}
      >
        <Icon
          size={36}
          style={{
            color,
            opacity: clicked ? Math.max(0, scale / size) * opacity : opacity,
            filter: hovered ? `drop-shadow(0 0 8px ${color})` : 'none',
            strokeWidth: 2,
            transition: clicked ? 'opacity 300ms ease-out' : 'none',
          }}
        />
      </button>
    </Html>
  )
}