import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CircuitBreaker } from './circuit-breaker'

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('starts closed', () => {
    const cb = new CircuitBreaker()
    expect(cb.isOpen()).toBe(false)
  })

  it('opens after 3 failures', () => {
    const cb = new CircuitBreaker()
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen()).toBe(false)
    cb.recordFailure()
    expect(cb.isOpen()).toBe(true)
  })

  it('resets after timeout', () => {
    const cb = new CircuitBreaker(3, 60_000)
    cb.recordFailure()
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen()).toBe(true)
    vi.advanceTimersByTime(60_001)
    expect(cb.isOpen()).toBe(false)
  })

  it('resets on success', () => {
    const cb = new CircuitBreaker()
    cb.recordFailure()
    cb.recordFailure()
    cb.recordSuccess()
    expect(cb.isOpen()).toBe(false)
    cb.recordFailure()
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen()).toBe(true)
  })

  it('uses custom threshold and timeout', () => {
    const cb = new CircuitBreaker(2, 30_000)
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen()).toBe(true)
    vi.advanceTimersByTime(30_001)
    expect(cb.isOpen()).toBe(false)
  })
})
