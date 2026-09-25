import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getLoaded, loadDeferred, useDeferredModule } from './deferred-module'

describe('loadDeferred', () => {
  it('loads a module once and remembers it', async () => {
    const module = { value: 1 }
    const loader = vi.fn(() => Promise.resolve(module))
    expect(getLoaded(loader)).toBeUndefined()
    const [a, b] = await Promise.all([
      loadDeferred(loader),
      loadDeferred(loader),
    ])
    expect(a).toBe(module)
    expect(b).toBe(module)
    await loadDeferred(loader)
    expect(loader).toHaveBeenCalledTimes(1)
    expect(getLoaded(loader)).toBe(module)
  })

  it('retries after a failed load', async () => {
    const loader = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('chunk gone'))
      .mockResolvedValueOnce('ok')
    await expect(loadDeferred(loader)).rejects.toThrow('chunk gone')
    await expect(loadDeferred(loader)).resolves.toBe('ok')
    expect(loader).toHaveBeenCalledTimes(2)
  })
})

describe('useDeferredModule', () => {
  function Probe({ loader }: { loader: () => Promise<{ label: string }> }) {
    const [module, load] = useDeferredModule(loader)
    return (
      <button type="button" onClick={() => void load()}>
        {module ? module.label : 'static'}
      </button>
    )
  }

  it('renders the static version until load() resolves', async () => {
    const loader = () => Promise.resolve({ label: 'loaded' })
    render(<Probe loader={loader} />)
    const button = screen.getByRole('button')
    expect(button.textContent).toBe('static')
    await act(async () => {
      button.click()
    })
    expect(screen.getByRole('button').textContent).toBe('loaded')
  })

  it('starts with a module that already loaded', async () => {
    const loader = () => Promise.resolve({ label: 'cached' })
    await loadDeferred(loader)
    render(<Probe loader={loader} />)
    expect(screen.getByRole('button').textContent).toBe('cached')
  })

  it('keeps the static version when loading fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const loader = () => Promise.reject(new Error('offline'))
    render(<Probe loader={loader} />)
    await act(async () => {
      screen.getByRole('button').click()
    })
    expect(screen.getByRole('button').textContent).toBe('static')
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })
})
