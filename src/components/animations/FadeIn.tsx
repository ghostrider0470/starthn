import { type HTMLMotionProps, motion, useReducedMotion as useMotionReducedMotion } from 'motion/react'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

interface RevealProps
  extends Omit<
    HTMLMotionProps<'div'>,
    'initial' | 'animate' | 'whileInView' | 'transition' | 'variants'
  > {
  children: React.ReactNode
  as?: 'div' | 'section'
  className?: string
  delay?: number
  duration?: number
  once?: boolean
  amount?: number
  offset?: number
}

interface StaggerContainerProps
  extends Omit<
    HTMLMotionProps<'div'>,
    'initial' | 'animate' | 'whileInView' | 'transition' | 'variants'
  > {
  children: React.ReactNode
  className?: string
  delayChildren?: number
  staggerChildren?: number
  once?: boolean
  amount?: number
}

interface StaggerItemProps
  extends Omit<
    HTMLMotionProps<'div'>,
    'initial' | 'animate' | 'whileInView' | 'transition' | 'variants'
  > {
  children: React.ReactNode
  className?: string
  duration?: number
  offset?: number
}

const defaultDuration = designSystem.animation.motion.duration.base
const defaultEase = designSystem.animation.motion.ease.out
const defaultOffset = designSystem.animation.motion.distance.slideUp

export function FadeIn({
  children,
  as = 'div',
  className,
  delay = 0,
  duration = defaultDuration,
  once = true,
  amount = 0.2,
  style,
  ...props
}: RevealProps) {
  const prefersReducedMotion = useMotionReducedMotion()
  const MotionComponent = as === 'section' ? motion.section : motion.div

  if (prefersReducedMotion) {
    return (
      <MotionComponent className={className} initial={false} style={style} {...props}>
        {children}
      </MotionComponent>
    )
  }

  return (
    <MotionComponent
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: defaultEase }}
      style={{ ...style, willChange: style?.willChange ?? 'opacity' }}
      {...props}
    >
      {children}
    </MotionComponent>
  )
}

export function SlideUp({
  children,
  as = 'div',
  className,
  delay = 0,
  duration = defaultDuration,
  once = true,
  amount = 0.2,
  offset = defaultOffset,
  style,
  ...props
}: RevealProps) {
  const prefersReducedMotion = useMotionReducedMotion()
  const MotionComponent = as === 'section' ? motion.section : motion.div

  if (prefersReducedMotion) {
    return (
      <MotionComponent className={className} initial={false} style={style} {...props}>
        {children}
      </MotionComponent>
    )
  }

  return (
    <MotionComponent
      className={className}
      initial={{ opacity: 0, y: offset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: defaultEase }}
      style={{ ...style, willChange: style?.willChange ?? 'opacity, transform' }}
      {...props}
    >
      {children}
    </MotionComponent>
  )
}

export function StaggerContainer({
  children,
  className,
  delayChildren = 0,
  staggerChildren = designSystem.animation.motion.stagger.cards,
  once = true,
  amount = 0.15,
  style,
  ...props
}: StaggerContainerProps) {
  const prefersReducedMotion = useMotionReducedMotion()

  if (prefersReducedMotion) {
    return (
      <motion.div className={className} initial={false} style={style} {...props}>
        {children}
      </motion.div>
    )
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren,
            staggerChildren,
          },
        },
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
  duration = defaultDuration,
  offset = defaultOffset,
  style,
  ...props
}: StaggerItemProps) {
  const prefersReducedMotion = useMotionReducedMotion()

  if (prefersReducedMotion) {
    return (
      <motion.div className={cn(className)} initial={false} style={style} {...props}>
        {children}
      </motion.div>
    )
  }

  return (
    <motion.div
      className={cn(className)}
      variants={{
        hidden: { opacity: 0, y: offset },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration,
            ease: defaultEase,
          },
        },
      }}
      style={{ ...style, willChange: style?.willChange ?? 'opacity, transform' }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
