import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('wrangler deployment config', () => {
  it('binds static assets for SSR locale loading', () => {
    const wrangler = readFileSync(
      resolve(process.cwd(), 'wrangler.jsonc'),
      'utf-8',
    )

    expect(wrangler).toMatch(/"assets"\s*:\s*{[\s\S]*"binding"\s*:\s*"ASSETS"/)
  })
})
