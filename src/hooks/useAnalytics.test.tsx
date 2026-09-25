import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnalytics } from './useAnalytics'
import { __resetConsentMemoryForTests, setConsent } from '@/lib/consent'

const mockAnalytics = vi.hoisted(() => ({
  init: vi.fn(async () => {}),
  page: vi.fn(async (_path: string, _title?: string) => {}),
  revoke: vi.fn(async () => {}),
  identify: vi.fn(async () => {}),
  reset: vi.fn(async () => {}),
}))

const mockLocation = vi.hoisted(() => ({
  current: { pathname: '/bs-BA/about', searchStr: '?ref=x' },
}))

vi.mock('@/lib/analytics', () => ({ analytics: mockAnalytics }))
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => mockLocation.current,
}))

type IdleCallback = () => void
let idleQueue: Array<IdleCallback> = []

function runIdle() {
  const queue = idleQueue
  idleQueue = []
  act(() => queue.forEach((cb) => cb()))
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)))

beforeEach(() => {
  window.localStorage.clear()
  __resetConsentMemoryForTests()
  vi.clearAllMocks()
  mockLocation.current = { pathname: '/bs-BA/about', searchStr: '?ref=x' }
  idleQueue = []
  Object.assign(window, {
    requestIdleCallback: (cb: IdleCallback) => idleQueue.push(cb),
    cancelIdleCallback: (id: number) => {
      idleQueue[id - 1] = () => {}
    },
  })
})

afterEach(() => {
  delete (window as { requestIdleCallback?: unknown }).requestIdleCallback
  delete (window as { cancelIdleCallback?: unknown }).cancelIdleCallback
  vi.useRealTimers()
})

describe('useAnalytics consent gating', () => {
  it('never initializes analytics without a decision', async () => {
    const { rerender } = renderHook(() => useAnalytics())
    runIdle()
    mockLocation.current = { pathname: '/bs-BA/contact', searchStr: '' }
    rerender()
    await settle()

    expect(idleQueue).toHaveLength(0)
    expect(mockAnalytics.init).not.toHaveBeenCalled()
    expect(mockAnalytics.page).not.toHaveBeenCalled()
  })

  it('never initializes analytics after the visitor declined', async () => {
    setConsent('denied')
    renderHook(() => useAnalytics())
    runIdle()
    await settle()

    expect(mockAnalytics.init).not.toHaveBeenCalled()
    expect(mockAnalytics.page).not.toHaveBeenCalled()
  })

  it('with earlier consent, defers init to idle time, then sends pathname + search', async () => {
    setConsent('granted')
    renderHook(() => useAnalytics())
    await settle()
    expect(mockAnalytics.init).not.toHaveBeenCalled()

    runIdle()
    await waitFor(() => expect(mockAnalytics.init).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(mockAnalytics.page).toHaveBeenCalledWith(
        '/bs-BA/about?ref=x',
        expect.anything(),
      ),
    )
  })

  it('falls back to a 3 s timeout without requestIdleCallback', async () => {
    delete (window as { requestIdleCallback?: unknown }).requestIdleCallback
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    setConsent('granted')
    renderHook(() => useAnalytics())

    await act(() => vi.advanceTimersByTimeAsync(2900))
    expect(mockAnalytics.init).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(200))
    vi.useRealTimers()
    await waitFor(() => expect(mockAnalytics.init).toHaveBeenCalledTimes(1))
  })

  it('starts immediately when the banner grants consent and sends the current page', async () => {
    renderHook(() => useAnalytics())
    await settle()
    expect(mockAnalytics.init).not.toHaveBeenCalled()

    act(() => setConsent('granted'))
    await waitFor(() => expect(mockAnalytics.init).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(mockAnalytics.page).toHaveBeenCalledWith(
        '/bs-BA/about?ref=x',
        undefined,
      ),
    )
  })

  it('revokes when the visitor declines later', async () => {
    setConsent('granted')
    renderHook(() => useAnalytics())
    runIdle()
    await waitFor(() => expect(mockAnalytics.init).toHaveBeenCalled())

    act(() => setConsent('denied'))
    await waitFor(() => expect(mockAnalytics.revoke).toHaveBeenCalledTimes(1))
  })

  it('tracks route changes and records the landing page first', async () => {
    setConsent('granted')
    const { rerender } = renderHook(() => useAnalytics())

    // Navigate before the idle start-up ran
    mockLocation.current = { pathname: '/bs-BA/contact', searchStr: '' }
    rerender()

    await waitFor(() => expect(mockAnalytics.page).toHaveBeenCalledTimes(2))
    expect(mockAnalytics.init).toHaveBeenCalledTimes(1)
    expect(mockAnalytics.page.mock.calls.map((call) => call[0])).toEqual([
      '/bs-BA/about?ref=x',
      '/bs-BA/contact',
    ])

    // Same path again → no duplicate page view
    rerender()
    await settle()
    expect(mockAnalytics.page).toHaveBeenCalledTimes(2)
  })
})
