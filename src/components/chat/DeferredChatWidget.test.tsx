import { act, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DeferredChatWidget } from './DeferredChatWidget'

const scheduler = vi.hoisted(() => ({
  run: null as null | (() => void),
  cancel: vi.fn(),
}))
const chat = vi.hoisted(() => ({ isOpen: false }))

vi.mock('./when-idle', () => ({
  whenIdleOrInteraction: (callback: () => void) => {
    scheduler.run = callback
    return scheduler.cancel
  },
}))
vi.mock('./ChatWidget', () => ({
  ChatWidget: () => <button type="button">chat launcher</button>,
}))
vi.mock('@/contexts/ChatContext', () => ({
  useChat: () => ({ isOpen: chat.isOpen }),
}))
vi.mock('@/lib/feature-flags', () => ({ featureFlags: { chat: true } }))
vi.mock('@/i18n', () => ({ ensureClientResources: vi.fn(async () => {}) }))


describe('DeferredChatWidget', () => {
  beforeEach(() => {
    scheduler.run = null
    chat.isOpen = false
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing on the server', () => {
    expect(renderToString(<DeferredChatWidget />)).toBe('')
  })

  it('stays unmounted through hydration, then mounts when the page is idle', async () => {
    render(<DeferredChatWidget />)
    expect(screen.queryByText('chat launcher')).toBeNull()
    expect(scheduler.run).toBeTypeOf('function')

    act(() => {
      scheduler.run?.()
    })

    expect(await screen.findByText('chat launcher')).toBeTruthy()
  })

  it('mounts right away when something opens the chat', async () => {
    chat.isOpen = true
    render(<DeferredChatWidget />)

    expect(await screen.findByText('chat launcher')).toBeTruthy()
  })

  it('cancels the scheduled mount on unmount', () => {
    const { unmount } = render(<DeferredChatWidget />)
    scheduler.cancel.mockClear()
    unmount()
    expect(scheduler.cancel).toHaveBeenCalledTimes(1)
  })
})
