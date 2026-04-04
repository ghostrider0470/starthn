import { useState } from 'react'
import { Bug, Fish, Bird, Rabbit, Squirrel, Cat, Dog, Turtle, Snail } from 'lucide-react'

interface CreatureProps {
  id: string
  position: { x: number; y: number }
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

export function Creature({ id, position, r, g, b, size, shape, opacity, alive, onEliminate }: CreatureProps) {
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!alive || clicked) return
    setClicked(true)
    setTimeout(() => onEliminate(id), 300)
  }

  if (!alive && !clicked) return null

  const color = `rgb(${r}, ${g}, ${b})`
  const Icon = ICON_MAP[shape]
  const displayScale = hovered ? size * 1.15 : size

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="absolute cursor-pointer hover:drop-shadow-lg transition-all"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: `translate(-50%, -50%) scale(${clicked ? 0 : displayScale})`,
        opacity: clicked ? 0 : opacity,
        transition: clicked ? 'opacity 300ms ease-out, transform 300ms ease-out' : 'transform 100ms ease-out',
        background: 'transparent',
        border: 'none',
        padding: 0,
      }}
      aria-label={`Creature ${id}`}
    >
      <Icon
        size={36}
        style={{
          color,
          filter: hovered ? `drop-shadow(0 0 8px ${color})` : 'none',
          strokeWidth: 2,
        }}
      />
    </button>
  )
}