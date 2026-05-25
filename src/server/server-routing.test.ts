import { describe, it, expect } from 'vitest'

describe('D1_PRIMARY routing convention', () => {
  it('has D1_PRIMARY set to "false" in wrangler.jsonc', async () => {
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
    expect(config.vars?.D1_PRIMARY).toBe('false')
  })
})
