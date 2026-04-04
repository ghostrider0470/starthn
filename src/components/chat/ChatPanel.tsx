import { useEffect, useRef, useState } from 'react'
import { ArrowUp, RotateCcw } from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import { ChatMessage } from './ChatMessage'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const QUICK_STARTERS = [
  'What services do you offer?',
  'What is your tech stack?',
  'How does your team model work?',
  'I have a project idea',
]

interface ChatPanelProps {
  className?: string
  height?: string
  hideStarters?: boolean
}

export function ChatPanel({ className, height = 'h-[400px]', hideStarters }: ChatPanelProps) {
  const { messages, send, isStreaming, error, clearMessages } = useChat()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || isStreaming) return
    send(input)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={cn('flex flex-col', height, className)}>
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && !hideStarters && (
          <div className="flex flex-col items-center gap-4 pt-6">
            <p className="text-sm text-muted-foreground">
              Hi! How can we help you today?
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_STARTERS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  className={cn(
                    'rounded-full border border-border bg-card px-3 py-1.5 text-xs',
                    'transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary',
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            message={msg}
            isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}
        {error && (
          <p className="text-center text-xs text-destructive">{error}</p>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              disabled={isStreaming}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
              aria-label="Start over"
              title="Start over"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isStreaming}
            className={cn(
              'flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20',
              'disabled:opacity-50',
            )}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="h-9 w-9 shrink-0 rounded-lg"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
