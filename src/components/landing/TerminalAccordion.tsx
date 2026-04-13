import { useState } from 'react'
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

interface AccordionItemProps {
  item: FAQItem
  index: number
  isOpen: boolean
  onToggle: () => void
}

function AccordionItem({ item, index, isOpen, onToggle }: AccordionItemProps) {
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
              <div className="text-sm text-muted-foreground leading-relaxed pl-2 border-l-2 border-border">
                {item.answer}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * Clean accordion for FAQ section
 */
export function TerminalAccordion({
  items,
  className,
  typingSpeed: _typingSpeed,
  enableTypingAnimation: _enableTypingAnimation,
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
      {/* Accordion items */}
      <div className="relative">
        {items.map((item, index) => (
          <AccordionItem
            key={index}
            item={item}
            index={index}
            isOpen={openIndex === index}
            onToggle={() => handleToggle(index)}
          />
        ))}
      </div>
    </div>
  )
}
