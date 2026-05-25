import { describe, it, expect } from 'vitest'

describe('UserRepository shape', () => {
  it('exports create, updateProfile, updatePasswordHash methods', async () => {
    const { UserRepository } = await import('./user')
    const proto = UserRepository.prototype as any
    expect(typeof proto.create).toBe('function')
    expect(typeof proto.updateProfile).toBe('function')
    expect(typeof proto.updatePasswordHash).toBe('function')
  })
})
