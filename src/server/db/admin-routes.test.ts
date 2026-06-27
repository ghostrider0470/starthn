import { describe, it, expect } from 'vitest'

describe('admin-routes missing-translations handler', () => {
  it('handleAdminRoute is importable', async () => {
    const { handleAdminRoute } = await import('./admin-routes')
    expect(typeof handleAdminRoute).toBe('function')
  })
})
