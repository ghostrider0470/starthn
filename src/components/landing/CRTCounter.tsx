import { useEffect, useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface CRTCounterProps {
  value: number
  suffix?: string
  duration?: number
  startCounting?: boolean
  className?: string
  glitchIntensity?: 'none' | 'low' | 'medium' | 'high'
}

// Glitch characters for the CRT effect
const GLITCH_CHARS = ['#', '@', '%', '&', '?', '!', '*', '$', '0', '1']

/**
 * CRT-style animated counter with glitch effects during count-up
 */
export function CRTCounter({
  value,
  suffix = '',
  duration = 2000,
  startCounting = false,
  className,
  glitchIntensity = 'medium',
}: CRTCounterProps) {
  const [displayValue, setDisplayValue] = useState('0')
  const [isGlitching, setIsGlitching] = useState(false)
  const rafRef = useRef<number | null>(null)
  const glitchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Glitch probability based on intensity
  const glitchProbability =
    glitchIntensity === 'high' ? 0.15 : glitchIntensity === 'medium' ? 0.1 : glitchIntensity === 'low' ? 0.05 : 0

  // Generate a glitched version of the number
  const glitchNumber = useCallback((num: number): string => {
    const numStr = num.toString()
    return numStr
      .split('')
      .map((char) => {
        if (char === '.' || char === ',') return char
        if (Math.random() < 0.3) {
          return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
        }
        return char
      })
      .join('')
  }, [])

  useEffect(() => {
    if (!startCounting) {
      setDisplayValue('0')
      return
    }

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setDisplayValue(value.toString())
      return
    }

    let startTime: number | null = null

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)

      // easeOutQuart for smooth deceleration
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const currentValue = Math.floor(value * easeOutQuart)

      // Random glitch effect during animation
      if (progress < 1 && Math.random() < glitchProbability) {
        setIsGlitching(true)
        setDisplayValue(glitchNumber(currentValue))

        // Clear glitch after short delay
        if (glitchTimeoutRef.current) {
          clearTimeout(glitchTimeoutRef.current)
        }
        glitchTimeoutRef.current = setTimeout(() => {
          setIsGlitching(false)
          setDisplayValue(currentValue.toString())
        }, 50)
      } else if (!isGlitching) {
        setDisplayValue(currentValue.toString())
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        // Final value - no glitch
        setDisplayValue(value.toString())
        setIsGlitching(false)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      if (glitchTimeoutRef.current) {
        clearTimeout(glitchTimeoutRef.current)
      }
    }
  }, [startCounting, value, duration, glitchProbability, glitchNumber, isGlitching])

  return (
    <span
      className={cn(
        'font-mono tabular-nums transition-all duration-75',
        isGlitching && 'animate-counter-glitch text-primary',
        className
      )}
    >
      {displayValue}
      {suffix && <span className="text-muted-foreground">{suffix}</span>}
    </span>
  )
}

/**
 * Animated data stream particles flowing into a target
 */
export function DataStreamEffect({ active = false }: { active?: boolean }) {
  if (!active) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-4 bg-gradient-to-b from-primary to-transparent animate-data-stream"
          style={{
            left: `${20 + i * 15}%`,
            animationDelay: `${i * 0.2}s`,
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  )
}
