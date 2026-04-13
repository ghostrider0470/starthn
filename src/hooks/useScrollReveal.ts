import { useEffect, useRef, useState, useCallback } from 'react'

export interface ScrollRevealOptions {
  /** IntersectionObserver threshold (0-1) */
  threshold?: number
  /** Only trigger once */
  triggerOnce?: boolean
  /** Delay in ms before triggering */
  delay?: number
  /** Root margin for intersection */
  rootMargin?: string
  /** Respect prefers-reduced-motion */
  respectReducedMotion?: boolean
}

export interface ScrollRevealResult {
  ref: React.RefObject<HTMLElement | null>
  isInView: boolean
  hasTriggered: boolean
}

/**
 * Hook for scroll-triggered reveal animations with accessibility support
 */
export function useScrollReveal(options: ScrollRevealOptions = {}): ScrollRevealResult {
  const {
    threshold = 0.2,
    triggerOnce = true,
    delay = 0,
    rootMargin = '-50px',
    respectReducedMotion = true,
  } = options

  const ref = useRef<HTMLElement | null>(null)
  const [isInView, setIsInView] = useState(false)
  const [hasTriggered, setHasTriggered] = useState(false)

  useEffect(() => {
    // Check for reduced motion preference
    if (respectReducedMotion) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReducedMotion) {
        setIsInView(true)
        setHasTriggered(true)
        return
      }
    }

    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (delay > 0) {
              setTimeout(() => {
                setIsInView(true)
                setHasTriggered(true)
              }, delay)
            } else {
              setIsInView(true)
              setHasTriggered(true)
            }

            if (triggerOnce) {
              observer.unobserve(entry.target)
            }
          } else if (!triggerOnce) {
            setIsInView(false)
          }
        })
      },
      { threshold, rootMargin }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold, triggerOnce, delay, rootMargin, respectReducedMotion])

  return { ref, isInView, hasTriggered }
}

export interface StaggeredRevealOptions extends ScrollRevealOptions {
  /** Delay between each child in ms */
  staggerDelay?: number
  /** Total number of children */
  childCount: number
}

/**
 * Hook for staggered reveal animations
 * Returns an array of delays for each child element
 */
export function useStaggeredReveal(options: StaggeredRevealOptions) {
  const { staggerDelay = 150, childCount, ...revealOptions } = options
  const { ref, isInView, hasTriggered } = useScrollReveal(revealOptions)

  const getChildDelay = useCallback(
    (index: number) => (isInView ? index * staggerDelay : 0),
    [isInView, staggerDelay]
  )

  const childDelays = Array.from({ length: childCount }, (_, i) => getChildDelay(i))

  return {
    containerRef: ref,
    isInView,
    hasTriggered,
    childDelays,
    getChildDelay,
  }
}
