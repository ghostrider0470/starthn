import { Creature } from './Creature'

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

interface CreatureSceneProps {
  figures: FigureData[]
  onEliminate: (id: string) => void
  backgroundColor: { r: number; g: number; b: number }
}

export function CreatureScene({ figures, onEliminate, backgroundColor }: CreatureSceneProps) {
  const bgColor = `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`

  // Generate random positions for creatures (scattered)
  const getPosition = (index: number): { x: number; y: number } => {
    // Use index as seed for consistent positions per creature
    const seed = index * 2654435761 % 2147483647
    const random1 = (Math.sin(seed) * 10000) % 1
    const random2 = (Math.sin(seed * 2) * 10000) % 1

    // Random position as percentages (10% to 90% for x, 10% to 90% for y)
    const x = 10 + (Math.abs(random1) * 80)
    const y = 10 + (Math.abs(random2) * 80)

    return { x, y }
  }

  return (
    <div
      className="relative h-[420px] w-full overflow-hidden rounded-lg transition-colors duration-500 sm:h-[500px] lg:h-[600px]"
      style={{ backgroundColor: bgColor }}
    >
      {figures.map((figure, index) => (
        <Creature
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
    </div>
  )
}
