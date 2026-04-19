import { MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useChat } from '@/contexts/ChatContext'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

export function ChatSection() {
  const { t } = useTranslation('landing')
  const { send, messages } = useChat()
  const rawPrompts = t('chat.prompts', { returnObjects: true })
  const prompts: string[] = Array.isArray(rawPrompts) ? (rawPrompts as string[]) : []

  return (
    <section className="relative overflow-hidden bg-background py-20 md:py-24">
      <div className={cn(designSystem.spacing.page.container, 'max-w-6xl')}>
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div className="lg:sticky lg:top-24">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <MessageCircle className="h-3.5 w-3.5" />
              {t('chat.badge')}
            </div>

            <h2 className="mb-4 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {t('chat.title')}
            </h2>

            <p className="mb-8 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
              {t('chat.description')}
            </p>

            <div className="flex flex-wrap gap-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  disabled={messages.some((m) => m.role === 'user' && m.content === prompt)}
                  className={cn(
                    'rounded-lg border border-border bg-card px-3 py-2 text-left text-sm',
                    'transition-all duration-200 hover:border-primary/40 hover:bg-primary/5',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-semibold">{t('chat.panelTitle')}</span>
            </div>
            <ChatPanel height="h-[450px]" />
          </div>
        </div>
      </div>
    </section>
  )
}
