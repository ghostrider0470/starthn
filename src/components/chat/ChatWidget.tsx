import { MessageCircle, X } from 'lucide-react'
import { useLocation } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useChat } from '@/contexts/ChatContext'
import { ChatPanel } from './ChatPanel'
import { cn } from '@/lib/utils'
import { featureFlags } from '@/lib/feature-flags'

export function ChatWidget() {
  const { isOpen, setIsOpen, messages } = useChat()
  const location = useLocation()

  if (!featureFlags.chat) return null
  if (/\/admin(\/|$)/.test(location.pathname)) return null

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className={cn(
              'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center max-md:bottom-24',
              'rounded-full bg-primary text-primary-foreground shadow-lg',
              'transition-shadow hover:shadow-xl hover:shadow-primary/25',
              messages.length === 0 && 'animate-pulse',
            )}
            aria-label="Open chat"
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'fixed overflow-hidden rounded-xl border border-border bg-card shadow-2xl',
              'z-[60] bottom-6 right-6 w-[400px]',
              'max-sm:z-[80] max-sm:inset-0 max-sm:w-full max-sm:rounded-none max-sm:border-0',
            )}
          >
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3 max-sm:pt-[max(0.75rem,env(safe-area-inset-top))]">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-semibold">Chat with Horizon</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ChatPanel height="h-[420px] max-sm:h-[calc(100dvh-4rem)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
