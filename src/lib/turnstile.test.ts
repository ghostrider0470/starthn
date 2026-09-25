import { afterEach, describe, expect, it } from 'vitest'
import {
  TURNSTILE_SCRIPT_SRC,
  loadTurnstileScript,
  resetTurnstileLoaderForTests,
} from './turnstile'

const scripts = () =>
  [...document.querySelectorAll<HTMLScriptElement>('script')].filter(
    (s) => s.src === TURNSTILE_SCRIPT_SRC,
  )

afterEach(() => {
  for (const s of scripts()) s.remove()
  delete (window as { turnstile?: unknown }).turnstile
  resetTurnstileLoaderForTests()
})

describe('loadTurnstileScript', () => {
  it('adds the script once, async, and resolves on load', async () => {
    const first = loadTurnstileScript()
    const second = loadTurnstileScript()
    expect(second).toBe(first)
    expect(scripts()).toHaveLength(1)
    expect(scripts()[0].async).toBe(true)
    scripts()[0].dispatchEvent(new Event('load'))
    await expect(first).resolves.toBeUndefined()
  })

  it('does nothing when Turnstile is already on the page', async () => {
    ;(window as { turnstile?: unknown }).turnstile = {}
    await loadTurnstileScript()
    expect(scripts()).toHaveLength(0)
  })

  it('allows a retry after a failed load', async () => {
    const failed = loadTurnstileScript()
    scripts()[0].dispatchEvent(new Event('error'))
    await expect(failed).rejects.toThrow()
    expect(scripts()).toHaveLength(0)
    void loadTurnstileScript()
    expect(scripts()).toHaveLength(1)
  })
})
