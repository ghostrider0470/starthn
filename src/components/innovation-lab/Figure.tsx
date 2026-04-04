import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface FigureProps {
  id: string
  r: number
  g: number
  b: number
  size: number // 0.6 to 1.4
  shape: 'circle' | 'square' | 'triangle'
  pattern: 'solid' | 'gradient' | 'radial'
  alive: boolean
  onEliminate: (id: string) => void
  backgroundColor: { r: number; g: number; b: number }
}

export function Figure({ id, r, g, b, size, shape, pattern, alive, onEliminate, backgroundColor }: FigureProps) {
  const [isClicked, setIsClicked] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)

  // Add subtle movement animation
  useEffect(() => {
    if (!alive) return

    const moveInterval = setInterval(() => {
      setPosition({
        x: Math.sin(Date.now() / 2000 + parseFloat(id.slice(-2))) * 3,
        y: Math.cos(Date.now() / 2500 + parseFloat(id.slice(-2))) * 3,
      })
      setRotation((Date.now() / 3000 + parseFloat(id.slice(-2))) * 360)
    }, 50)

    return () => clearInterval(moveInterval)
  }, [alive, id])

  const handleClick = () => {
    if (!alive || isClicked) return
    setIsClicked(true)
    setTimeout(() => onEliminate(id), 300)
  }

  if (!alive && !isClicked) return null

  const figureColor = `rgb(${r}, ${g}, ${b})`
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const borderColor = luminance > 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'

  // Create different visual patterns
  const getBackgroundStyle = () => {
    switch (pattern) {
      case 'gradient':
        const r2 = Math.min(255, r + 30)
        const g2 = Math.min(255, g + 30)
        const b2 = Math.min(255, b + 30)
        return {
          background: `linear-gradient(135deg, rgb(${r}, ${g}, ${b}) 0%, rgb(${r2}, ${g2}, ${b2}) 100%)`,
        }
      case 'radial':
        const r3 = Math.max(0, r - 40)
        const g3 = Math.max(0, g - 40)
        const b3 = Math.max(0, b - 40)
        return {
          background: `radial-gradient(circle at 30% 30%, rgb(${r}, ${g}, ${b}), rgb(${r3}, ${g3}, ${b3}))`,
        }
      default:
        return { backgroundColor: figureColor }
    }
  }

  const getShapeClass = () => {
    switch (shape) {
      case 'square':
        return 'rounded-sm'
      case 'triangle':
        return 'rounded-sm' // Will use clip-path
      default:
        return 'rounded-full'
    }
  }

  const triangleStyle = shape === 'triangle' ? {
    clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
  } : {}

  return (
    <button
      onClick={handleClick}
      onTouchEnd={(e) => {
        e.preventDefault()
        handleClick()
      }}
      disabled={!alive}
      className={cn(
        "relative w-full aspect-square transition-all duration-300",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        alive && !isClicked && "hover:scale-125 hover:shadow-lg cursor-pointer active:scale-90",
        isClicked && "animate-fade-out scale-50 opacity-0",
        getShapeClass()
      )}
      style={{
        ...getBackgroundStyle(),
        border: `1px solid ${borderColor}`,
        transform: alive && !isClicked
          ? `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${size})`
          : undefined,
        ...triangleStyle,
      }}
      aria-label={`Figure ${id}`}
    >
      <span className="sr-only">
        RGB: {r}, {g}, {b}, Size: {size}
      </span>
    </button>
  )
}