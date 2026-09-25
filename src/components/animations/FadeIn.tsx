import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import { designSystem } from '@/lib/design-system'

/**
 * Scroll reveals without a motion library.
 *
 * The server HTML and the hydration render are plain, fully visible
 * elements: no inline opacity or transform, so crawlers, visitors without
 * JavaScript and the first paint always see the content. After hydration,
 * an element that is still below the viewport is held at its hidden
 * keyframe by a paused Web Animation, which plays when the element scrolls
 * into view. Elements already on screen never animate, and nothing animates
 * under prefers-reduced-motion or without IntersectionObserver and
 * Element.animate. The animation only fills backwards, so once it ends (or
 * is cancelled on unmount) it leaves no style behind on the element.
 */

type RevealTag = 'div' | 'section' | 'article' | 'ul' | 'li' | 'h2'

type ElementProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  children: ReactNode
  as?: RevealTag
}

type ViewportProps = {
  /** Share of the trigger that must be visible (IntersectionObserver threshold). */
  amount?: number
  /** IntersectionObserver rootMargin. */
  margin?: string
}

type RevealTarget = {
  el: HTMLElement
  /** Start offset in px. */
  x: number
  y: number
  /** Seconds. */
  duration: number
  delay: number
}

const tokens = designSystem.animation.motion
const DEFAULT_DURATION = tokens.duration.base
const DEFAULT_OFFSET = tokens.distance.slideUp
const EASING = `cubic-bezier(${tokens.ease.out.join(', ')})`

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Calls `onEnter` once, when `el` scrolls into view. Only arms itself when
 * `el` is still below the viewport right now (i.e. after hydration), the
 * visitor has not asked for reduced motion and IntersectionObserver exists;
 * otherwise returns undefined and the content should stay as rendered.
 * The returned cleanup stops observing.
 */
export function observeFirstReveal(
  el: HTMLElement,
  onEnter: () => void,
  { amount = 0, margin = '0px' }: ViewportProps = {},
): (() => void) | undefined {
  if (
    typeof window.IntersectionObserver !== 'function' ||
    prefersReducedMotion() ||
    el.getBoundingClientRect().top < window.innerHeight
  ) {
    return undefined
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      onEnter()
    },
    { threshold: amount, rootMargin: margin },
  )
  observer.observe(el)
  return () => observer.disconnect()
}

/**
 * Holds `targets` at their hidden keyframe until `trigger` scrolls into view,
 * then plays their reveal (see observeFirstReveal for when it applies).
 * Returns a cleanup that stops observing and cancels the animations, which
 * leaves the content visible.
 */
function revealWhenInView(
  trigger: HTMLElement,
  targets: Array<RevealTarget>,
  viewport: ViewportProps,
): (() => void) | undefined {
  if (
    targets.length === 0 ||
    targets.some(({ el }) => typeof el.animate !== 'function')
  ) {
    return undefined
  }

  const animations: Array<Animation> = []
  const cancelAll = () => animations.forEach((animation) => animation.cancel())
  // IntersectionObserver callbacks are async, so the animations below exist
  // before this can fire.
  const stopObserving = observeFirstReveal(
    trigger,
    () => animations.forEach((animation) => animation.play()),
    viewport,
  )
  if (!stopObserving) return undefined

  try {
    for (const { el, x, y, duration, delay } of targets) {
      const animation = el.animate(
        [
          {
            opacity: 0,
            transform: x || y ? `translate3d(${x}px, ${y}px, 0)` : 'none',
          },
          { opacity: 1, transform: 'none' },
        ],
        {
          duration: Math.round(duration * 1000),
          delay: Math.round(delay * 1000),
          easing: EASING,
          fill: 'backwards',
        },
      )
      animation.pause()
      animations.push(animation)
    }
  } catch {
    // Never leave content stuck at the hidden keyframe.
    stopObserving()
    cancelAll()
    return undefined
  }

  return () => {
    stopObserving()
    cancelAll()
  }
}

interface RevealProps extends ElementProps, ViewportProps {
  /** Seconds to wait after the element comes into view. */
  delay?: number
  /** Seconds. */
  duration?: number
  /** Horizontal start offset in px (negative starts from the left). */
  x?: number
  /** Vertical start offset in px (positive starts from below). */
  y?: number
}

/**
 * Generic reveal: fades in from an optional x/y offset. Whether it animates
 * is decided once, after mount, so later re-renders never hide content that
 * is already visible.
 */
export function Reveal({
  children,
  as = 'div',
  delay = 0,
  duration = DEFAULT_DURATION,
  x = 0,
  y = 0,
  amount,
  margin,
  ...props
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  // Only the mount-time values matter (see above).
  const options = useRef({ delay, duration, x, y, amount, margin })

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const { amount: threshold, margin: rootMargin, ...motion } = options.current
    return revealWhenInView(el, [{ el, ...motion }], {
      amount: threshold,
      margin: rootMargin,
    })
  }, [])

  // All tags share HTMLElement attributes; 'div' only narrows the JSX types.
  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...props}>
      {children}
    </Tag>
  )
}

type PresetProps = Omit<RevealProps, 'x' | 'y'>

export function FadeIn(props: PresetProps) {
  return <Reveal {...props} />
}

export function SlideUp({
  offset = DEFAULT_OFFSET,
  ...props
}: PresetProps & { offset?: number }) {
  return <Reveal y={offset} {...props} />
}

type StaggerItemSpec = Pick<RevealTarget, 'x' | 'y' | 'duration'>
type RegisterStaggerItem = (
  el: HTMLElement,
  spec: StaggerItemSpec,
) => () => void

const StaggerContext = createContext<RegisterStaggerItem | null>(null)

interface StaggerContainerProps extends ElementProps, ViewportProps {
  /** Seconds before the first item starts. */
  delayChildren?: number
  /** Seconds between consecutive items. */
  staggerChildren?: number
}

/**
 * Reveals its StaggerItem descendants one after another, in document order,
 * when the container scrolls into view. The container itself never fades.
 */
export function StaggerContainer({
  children,
  as = 'div',
  delayChildren = 0,
  staggerChildren = tokens.stagger.cards,
  amount,
  margin,
  ...props
}: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const items = useRef(new Map<HTMLElement, StaggerItemSpec>())
  const options = useRef({ delayChildren, staggerChildren, amount, margin })

  const register = useCallback<RegisterStaggerItem>((el, spec) => {
    items.current.set(el, spec)
    return () => {
      items.current.delete(el)
    }
  }, [])

  // Child effects run before this one, so every mounted item is registered.
  useEffect(() => {
    const container = ref.current
    if (!container) return undefined
    const {
      delayChildren: first,
      staggerChildren: step,
      ...viewport
    } = options.current
    const targets = Array.from(items.current)
      .sort(([a], [b]) =>
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1,
      )
      .map(([el, spec], i) => ({ el, ...spec, delay: first + i * step }))
    return revealWhenInView(container, targets, viewport)
  }, [])

  const Tag = as as 'div'
  return (
    <StaggerContext.Provider value={register}>
      <Tag ref={ref} {...props}>
        {children}
      </Tag>
    </StaggerContext.Provider>
  )
}

interface StaggerItemProps extends ElementProps {
  /** Seconds. */
  duration?: number
  /** Vertical start offset in px. */
  offset?: number
}

/** One item of a StaggerContainer. Outside a container it is a plain element. */
export function StaggerItem({
  children,
  as = 'div',
  duration = DEFAULT_DURATION,
  offset = DEFAULT_OFFSET,
  ...props
}: StaggerItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const register = useContext(StaggerContext)
  const spec = useRef<StaggerItemSpec>({ x: 0, y: offset, duration })

  useEffect(() => {
    const el = ref.current
    if (!el || !register) return undefined
    return register(el, spec.current)
  }, [register])

  const Tag = as as 'div'
  return (
    <Tag ref={ref} {...props}>
      {children}
    </Tag>
  )
}
