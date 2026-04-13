import { describe, it, expect } from 'vitest'
import { parseJson } from './client'

describe('parseJson', () => {
  it('parses valid JSON string', () => {
    expect(parseJson('["a","b"]', [])).toEqual(['a', 'b'])
  })

  it('returns fallback for null', () => {
    expect(parseJson(null, [])).toEqual([])
  })

  it('returns fallback for invalid JSON', () => {
    expect(parseJson('not json', {})).toEqual({})
  })
})
