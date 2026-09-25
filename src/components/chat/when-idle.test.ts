import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INTERACTION_EVENTS, whenIdleOrInteraction } from './when-idle'

function setReadyState(state: DocumentReadyState) {
  Object.defineProperty(document, 'readyState', {
    configurable: true,
    get: () => state,
  })
}

describe('whenIdleOrInteraction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setReadyState('complete')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    // Back to jsdom's own getter.
    delete (document as unknown as Record<string, unknown>).readyState
  })

  it('runs after the delay and an idle period, once', () => {
    const idle = vi.fn((cb: IdleRequestCallback) => {
      setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 10 }), 50)
      return 1
    })
    vi.stubGlobal('requestIdleCallback', idle)
    vi.stubGlobal('cancelIdleCallback', vi.fn())
    const callback = vi.fn()

    whenIdleOrInteraction(callback, { delayMs: 2000, idleTimeoutMs: 1500 })

    vi.advanceTimersByTime(1999)
    expect(idle).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(idle).toHaveBeenCalledWith(expect.any(Function), { timeout: 1500 })
    expect(callback).not.toHaveBeenCalled()
    vi.advanceTimersByTime(50)
    expect(callback).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new Event('pointerdown'))
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('waits for the load event before starting the delay', () => {
    setReadyState('interactive')
    const callback = vi.fn()

    whenIdleOrInteraction(callback, { delayMs: 100 })
    vi.advanceTimersByTime(5000)
    expect(callback).not.toHaveBeenCalled()

    window.dispatchEvent(new Event('load'))
    vi.advanceTimersByTime(100)
    vi.runOnlyPendingTimers()
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it.each(INTERACTION_EVENTS)('runs at once on the first %s', (type) => {
    const callback = vi.fn()
    whenIdleOrInteraction(callback, { delayMs: 60_000 })

    window.dispatchEvent(new Event(type))
    expect(callback).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(120_000)
    window.dispatchEvent(new Event(type))
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('never runs once cancelled', () => {
    const callback = vi.fn()
    const cancel = whenIdleOrInteraction(callback, { delayMs: 10 })

    cancel()
    window.dispatchEvent(new Event('keydown'))
    vi.advanceTimersByTime(10_000)
    expect(callback).not.toHaveBeenCalled()
  })
})
