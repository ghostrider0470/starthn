import { useEffect, useRef } from 'react'
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
  const panelRef = useRef<HTMLDivElement>(null)

  // Lock body scroll + pin chat to visualViewport on mobile (iOS keyboard fix)
  useEffect(() => {
    if (!isOpen) return
    if (typeof window === 'undefined') return
    if (window.innerWidth >= 640) return // mobile only

    // Lock body scroll so iOS doesn't shift the layout when the input is focused
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.overflow = 'hidden'

    // Pin the chat to the visual viewport (the actual visible area)
    const vv = window.visualViewport
    let rafId: number | null = null

    function applyViewport() {
      rafId = null
      const el = panelRef.current
      if (!el || !vv) return
      el.style.height = `${vv.height}px`
      el.style.width = `${vv.width}px`
      el.style.top = `${vv.offsetTop}px`
      el.style.left = `${vv.offsetLeft}px`
    }

    function schedule() {
      if (rafId != null) return
      rafId = requestAnimationFrame(applyViewport)
    }

    if (vv) {
      applyViewport()
      vv.addEventListener('resize', schedule)
      vv.addEventListener('scroll', schedule)
    }

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId)
      if (vv) {
        vv.removeEventListener('resize', schedule)
        vv.removeEventListener('scroll', schedule)
      }
      const el = panelRef.current
      if (el) {
        el.style.height = ''
        el.style.width = ''
        el.style.top = ''
        el.style.left = ''
      }
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.overflow = ''
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

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

      {isOpen && (
        <div
          ref={panelRef}
          className={cn(
            'fixed overflow-hidden rounded-xl border border-border bg-card shadow-2xl',
            'z-[60] bottom-6 right-6 w-[400px] max-w-[calc(100vw-3rem)] max-h-[calc(100dvh-6rem)]',
            'max-md:bottom-20 max-md:right-3 max-md:left-3 max-md:w-auto max-md:max-w-none',
            'max-sm:z-[80] max-sm:top-0 max-sm:left-0 max-sm:right-auto max-sm:bottom-auto max-sm:w-screen max-sm:max-w-none max-sm:h-screen max-sm:max-h-none max-sm:rounded-none max-sm:border-0',
          )}
        >
          <div className="flex h-full flex-col">
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

            <ChatPanel height="h-[420px] max-sm:h-auto max-sm:flex-1 max-sm:min-h-0" />
          </div>
        </div>
      )}
    </>
  )
}
