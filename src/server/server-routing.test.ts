import { describe, it, expect } from 'vitest'
import {
  getD1PrimaryMissingBindings,
  isD1PrimaryEnabled,
} from './d1-primary-routing'

describe('D1_PRIMARY routing convention', () => {
  it('has D1_PRIMARY set to "true" in wrangler.jsonc (D1 is now the permanent primary)', async () => {
    const fs = await import('fs/promises')
    const raw = await fs.readFile('wrangler.jsonc', 'utf-8')
    // Strip jsonc line comments (lines that start with optional whitespace + //)
    // and block comments, then parse as JSON
    const cleaned = raw
      .split('\n')
      .map((line) => (line.trimStart().startsWith('//') ? '' : line))
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '')
    const config = JSON.parse(cleaned)
    expect(config.vars?.D1_PRIMARY).toBe('true')
  })

  it('treats string and boolean true as D1_PRIMARY enabled', () => {
    expect(isD1PrimaryEnabled({ D1_PRIMARY: 'true' })).toBe(true)
    expect(isD1PrimaryEnabled({ D1_PRIMARY: true })).toBe(true)
    expect(isD1PrimaryEnabled({ D1_PRIMARY: 'false' })).toBe(false)
  })

  it('requires DB and JWT_SECRET before D1_PRIMARY routes can run', () => {
    expect(
      getD1PrimaryMissingBindings({
        D1_PRIMARY: true,
        DB: {},
        JWT_SECRET: 'secret',
      }),
    ).toEqual([])

    expect(getD1PrimaryMissingBindings({ D1_PRIMARY: true, DB: {} })).toEqual([
      'JWT_SECRET',
    ])
    expect(
      getD1PrimaryMissingBindings({ D1_PRIMARY: true, JWT_SECRET: 'secret' }),
    ).toEqual(['DB'])
  })
})
