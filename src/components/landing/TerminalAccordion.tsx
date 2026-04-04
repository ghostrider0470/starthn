import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FAQItem {
  question: string
  answer: string
}

interface TerminalAccordionProps {
  items: FAQItem[]
  className?: string
  typingSpeed?: number
  enableTypingAnimation?: boolean
}

interface TerminalItemProps {
  item: FAQItem
  index: number
  isOpen: boolean
  onToggle: () => void
  typingSpeed: number
  enableTypingAnimation: boolean
}

/**
 * Typing text component that reveals characters one by one
 */
function TypingText({
  text,
  speed = 50,
  onComplete,
  isActive,
}: {
  text: string
  speed?: number
  onComplete?: () => void
  isActive: boolean
}) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isActive) {
      setDisplayedText('')
      setIsComplete(false)
      return
    }

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setDisplayedText(text)
      setIsComplete(true)
      onComplete?.()
      return
    }

    let currentIndex = 0
    setDisplayedText('')
    setIsComplete(false)

    const typeNextChar = () => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1))
        currentIndex++
        timeoutRef.current = setTimeout(typeNextChar, speed)
      } else {
        setIsComplete(true)
        onComplete?.()
      }
    }

    // Small delay before starting
    timeoutRef.current = setTimeout(typeNextChar, 100)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [text, speed, isActive, onComplete])

  return (
    <span className="font-mono">
      {displayedText}
      {!isComplete && isActive && (
        <span className="animate-blink text-primary">▌</span>
      )}
    </span>
  )
}

/**
 * Individual terminal accordion item
 */
function TerminalItem({
  item,
  index,
  isOpen,
  onToggle,
  typingSpeed,
  enableTypingAnimation,
}: TerminalItemProps) {
  const [hasTyped, setHasTyped] = useState(false)

  // Reset typing state when closed
  useEffect(() => {
    if (!isOpen) {
      setHasTyped(false)
    }
  }, [isOpen])

  const handleTypingComplete = useCallback(() => {
    setHasTyped(true)
  }, [])

  return (
    <motion.div
      className={cn(
        'border-b border-border last:border-b-0',
        'transition-colors duration-200',
        isOpen && 'bg-muted/50'
      )}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      {/* Question / Trigger */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full px-4 py-4 text-left',
          'flex items-start gap-3',
          'hover:bg-muted transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-inset',
          'group'
        )}
        aria-expanded={isOpen}
      >
        {/* Chevron indicator */}
        <ChevronRight
          className={cn(
            'h-4 w-4 mt-1 shrink-0 text-primary transition-transform duration-300',
            isOpen && 'rotate-90'
          )}
        />

        {/* Question text */}
        <span
          className={cn(
            'flex-1 min-w-0 font-medium text-sm leading-relaxed text-left',
            'group-hover:text-primary transition-colors duration-200',
            isOpen && 'text-primary'
          )}
        >
          {item.question}
        </span>
      </button>

      {/* Answer / Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pl-11">
              {/* Answer text */}
              <div className="text-sm text-muted-foreground dark:text-muted-foreground leading-relaxed pl-2 border-l-2 border-border">
                {enableTypingAnimation && !hasTyped ? (
                  <TypingText
                    text={item.answer}
                    speed={typingSpeed}
                    isActive={isOpen}
                    onComplete={handleTypingComplete}
                  />
                ) : (
                  <>
                    <span className="font-mono">{item.answer}</span>
                    <span className="animate-blink text-primary ml-0.5">▌</span>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * Terminal-styled accordion for FAQ section with CRT aesthetics
 */
export function TerminalAccordion({
  items,
  className,
  typingSpeed = 30,
  enableTypingAnimation = true,
}: TerminalAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden',
        'border border-border',
        'bg-card',
        'shadow-lg',
        className
      )}
    >
      {/* Window dots (dark only) */}
      <div className="px-4 pt-3 pb-1 gap-1.5 opacity-40 hidden dark:flex">
        <div className="w-3 h-3 rounded-full bg-destructive/80" />
        <div className="w-3 h-3 rounded-full bg-accent/80" />
        <div className="w-3 h-3 rounded-full bg-primary/80" />
      </div>

      {/* Accordion items */}
      <div className="relative">
        {items.map((item, index) => (
          <TerminalItem
            key={index}
            item={item}
            index={index}
            isOpen={openIndex === index}
            onToggle={() => handleToggle(index)}
            typingSpeed={typingSpeed}
            enableTypingAnimation={enableTypingAnimation}
          />
        ))}
      </div>
    </div>
  )
}
