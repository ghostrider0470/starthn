import { Suspense, lazy, useEffect, useState } from 'react'
import { whenIdleOrInteraction } from './when-idle'
import { useChat } from '@/contexts/ChatContext'
import { featureFlags } from '@/lib/feature-flags'
import { ensureClientResources } from '@/i18n'
import { getLocaleFromPath } from '@/lib/i18n-utils'

// The widget and `motion` (its launcher animation) are about 47 KB of
// compressed JS. Loading them during hydration made them compete with the
// stylesheet, the LCP image and the fonts on slow connections, so they load
// after the page is idle or on the first interaction instead. Its strings
// (landing:chat) are dehydrated on every page; the ensure call only guards
// against a page that was rendered without them.
const ChatWidget = lazy(() =>
  Promise.all([
    import('./ChatWidget'),
    ensureClientResources(getLocaleFromPath(window.location.pathname), [
      'landing:chat',
    ]),
  ]).then(([m]) => ({ default: m.ChatWidget })),
)

/**
 * Mounts the chat launcher once the page is idle or the visitor interacts.
 * Renders nothing during SSR and on the first client render, so hydration is
 * unaffected. The launcher keeps its entrance animation (owner decision); it
 * just starts a moment later. Opening the chat from elsewhere (useChat's
 * setIsOpen, e.g. the contact page) mounts it immediately.
 */
export function DeferredChatWidget() {
  const { isOpen } = useChat()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!featureFlags.chat) return undefined
    return whenIdleOrInteraction(() => setReady(true))
  }, [])

  if (!featureFlags.chat || (!ready && !isOpen)) return null

  return (
    <Suspense fallback={null}>
      <ChatWidget />
    </Suspense>
  )
}
