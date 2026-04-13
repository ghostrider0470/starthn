import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType } from '@/contexts/ChatContext'

interface ChatMessageProps {
  message: ChatMessageType
  isStreaming?: boolean
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md',
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {message.content}
          {isStreaming && !isUser && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary/70" />
          )}
        </p>
      </div>
    </div>
  )
}
