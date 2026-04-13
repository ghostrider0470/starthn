import { MessageCircle } from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

const SUGGESTED_PROMPTS = [
  'What tech stack do you use?',
  'How does your engagement model work?',
  'Tell me about your cloud services',
  'What industries do you work with?',
]

export function ChatSection() {
  const { send, messages } = useChat()

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-2 items-start">
          <div className="lg:sticky lg:top-24">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <MessageCircle className="h-3.5 w-3.5" />
              AI-Powered
            </div>

            <h2
              className={cn(
                designSystem.typography.heading.h1,
                'text-3xl md:text-4xl font-bold mb-4',
              )}
            >
              Ask Us Anything
            </h2>

            <p
              className={cn(
                designSystem.typography.body.large,
                designSystem.typography.muted,
                'mb-8 max-w-md',
              )}
            >
              Chat with our AI assistant to learn about our services, tech stack, and how we work. No forms, no waiting.
            </p>

            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  disabled={messages.some(m => m.role === 'user' && m.content === prompt)}
                  className={cn(
                    'rounded-lg border border-border bg-card px-3 py-2 text-sm text-left',
                    'transition-all duration-200 hover:border-primary/30 hover:bg-primary/5',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-semibold">Chat with Horizon</span>
            </div>
            <ChatPanel height="h-[450px]" />
          </div>
        </div>
      </div>
    </section>
  )
}
