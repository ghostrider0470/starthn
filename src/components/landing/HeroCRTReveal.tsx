import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { useCRTSoundContextSafe } from '@/hooks/useCRTSound'
import { useIsDarkMode } from '@/hooks/useIsDarkMode'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface HeroCRTRevealProps {
  children: React.ReactNode
  onBootComplete?: () => void
}

type BootPhase = 'off' | 'warming' | 'scanline' | 'content' | 'complete'

/**
 * Orchestrates a CRT boot sequence animation for the hero section
 * Timing: 0-300ms warming → 300-600ms scanline → 600-1500ms content → complete
 */
export function HeroCRTReveal({ children, onBootComplete }: HeroCRTRevealProps) {
  const [phase, setPhase] = useState<BootPhase>('off')
  const [shouldRender, setShouldRender] = useState(true)
  const sound = useCRTSoundContextSafe()
  const isDarkMode = useIsDarkMode()
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimateCRT = isDarkMode && !prefersReducedMotion

  useEffect(() => {
    if (!shouldAnimateCRT) {
      // Skip animation entirely
      setPhase('complete')
      setShouldRender(true)
      onBootComplete?.()
      return
    }

    // Boot sequence timing (compressed for faster perceived load)
    const timings = {
      warming: 0,
      scanline: 200,
      content: 400,
      complete: 800,
    }

    setShouldRender(true)
    setPhase('warming')

    // Play boot sound at start
    sound?.playBootSound()

    const scanlineTimer = setTimeout(() => setPhase('scanline'), timings.scanline)
    const contentTimer = setTimeout(() => setPhase('content'), timings.content)
    const completeTimer = setTimeout(() => {
      setPhase('complete')
      onBootComplete?.()
    }, timings.complete)

    return () => {
      clearTimeout(scanlineTimer)
      clearTimeout(contentTimer)
      clearTimeout(completeTimer)
    }
  }, [onBootComplete, shouldAnimateCRT, sound])

  if (!shouldRender) {
    return null
  }

  if (!shouldAnimateCRT || phase === ('complete' as any)) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      {/* Phosphor warming effect — dark mode: orange glow, light mode: subtle white flash */}
      <AnimatePresence>
        {phase === 'warming' && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0.4, 0.6, 0.3] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, times: [0, 0.2, 0.5, 0.7, 1] }}
          >
            {/* Dark: orange/purple phosphor glow */}
            <div
              className="absolute inset-0 hidden dark:block"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(255,107,53,0.4) 0%, rgba(168,85,247,0.2) 40%, transparent 70%)',
                filter: 'blur(30px)',
              }}
            />
            {/* Light: subtle gray flash */}
            <div
              className="absolute inset-0 dark:hidden"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(0,0,0,0.03) 0%, transparent 70%)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Horizontal scanline sweep — dark mode only */}
      <AnimatePresence>
        {phase === 'scanline' && (
          <motion.div
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent z-50 pointer-events-none hidden dark:block"
            style={{ boxShadow: '0 0 20px 10px rgba(255,107,53,0.5)' }}
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: '100vh', opacity: [1, 1, 0.8] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Main content with reveal animation */}
      <motion.div
        initial={{ opacity: 0, filter: 'blur(10px) brightness(2)' }}
        animate={{
          opacity: phase === 'content' || phase === ('complete' as any) ? 1 : 0,
          filter:
            phase === ('complete' as any)
              ? 'blur(0px) brightness(1)'
              : phase === 'content'
                ? 'blur(2px) brightness(1.2)'
                : 'blur(10px) brightness(2)',
        }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        {children}
      </motion.div>

      {/* Screen flicker overlay during boot — dark mode only */}
      {(phase === 'warming' || phase === 'scanline') && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-40 hidden dark:block"
          animate={{
            opacity: [0.1, 0.05, 0.15, 0.02, 0.1],
          }}
          transition={{ duration: 0.2, repeat: Infinity }}
          style={{ background: 'white' }}
        />
      )}
    </div>
  )
}

/**
 * Typing cursor component that blinks with CRT phosphor effect
 */
export function CRTCursor({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block w-3 h-[1.1em] ml-1 align-middle',
        'bg-primary animate-blink',
        'shadow-[0_0_10px_var(--primary),0_0_20px_var(--primary)]',
        className
      )}
      aria-hidden="true"
    />
  )
}

/**
 * Scroll indicator with signal-lost flicker effect
 */
export function CRTScrollIndicator() {
  const [isFlickering, setIsFlickering] = useState(false)
  const isDarkMode = useIsDarkMode()
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimateCRT = isDarkMode && !prefersReducedMotion

  // Periodic flicker effect — dark mode only (Apple light mode stays clean)
  useEffect(() => {
    if (!shouldAnimateCRT) {
      setIsFlickering(false)
      return
    }

    const flickerInterval = setInterval(() => {
      setIsFlickering(true)
      setTimeout(() => setIsFlickering(false), 1000)
    }, 5000 + Math.random() * 3000)

    return () => clearInterval(flickerInterval)
  }, [shouldAnimateCRT])

  return (
    <motion.div
      className={cn(
        'flex flex-col items-center gap-3',
        isFlickering && 'dark:animate-signal-lost'
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.5 }}
    >
      <motion.div
        className={cn(
          'text-sm uppercase tracking-widest',
          // Light: clean, no blinking
          'text-muted-foreground font-medium',
          // Dark: terminal aesthetic
          'dark:text-muted-foreground dark:font-mono dark:font-semibold dark:text-base'
        )}
        animate={shouldAnimateCRT ? { opacity: [1, 0.6, 1] } : { opacity: 1 }}
        transition={shouldAnimateCRT ? { duration: 2, repeat: Infinity } : { duration: 0 }}
      >
        <span className="hidden dark:inline">{'> '}</span>Scroll to Explore
      </motion.div>
      <div className={cn(
        'relative w-7 h-12 rounded-full border-2 flex items-start justify-center p-2 overflow-hidden',
        'border-border dark:border-border/80'
      )}>
        {/* Animated scroll dot */}
        <motion.div
          className={cn(
            'w-1.5 h-3 rounded-full',
            'bg-foreground dark:bg-primary',
            'dark:shadow-[0_0_8px_var(--primary)]'
          )}
          animate={shouldAnimateCRT ? { y: [0, 8, 0] } : { y: 0 }}
          transition={shouldAnimateCRT ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0 }}
        />
        {/* Scanline effect — dark mode only */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30 hidden dark:block"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 3px)',
          }}
        />
      </div>
    </motion.div>
  )
}
