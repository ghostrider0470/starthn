import { describe, it, expect } from 'vitest'
import { snapWidth, isStale } from './image-handler'

describe('snapWidth', () => {
  const available = [400, 800, 1200, 1600, 2000]

  it('returns exact match when width is in the set', () => {
    expect(snapWidth(800, available)).toBe(800)
  })

  it('rounds up to nearest available when between two widths', () => {
    expect(snapWidth(500, available)).toBe(800)
    expect(snapWidth(1000, available)).toBe(1200)
    expect(snapWidth(1700, available)).toBe(2000)
  })

  it('returns smallest available when width is below the minimum', () => {
    expect(snapWidth(48, available)).toBe(400)
  })

  it('clamps to largest when width exceeds the maximum', () => {
    expect(snapWidth(3000, available)).toBe(2000)
  })

  it('handles single-element array', () => {
    expect(snapWidth(500, [800])).toBe(800)
  })
})

describe('isStale', () => {
  it('returns false when version matches', () => {
    expect(isStale('img/w800-v1000.webp', 1000)).toBe(false)
  })

  it('returns true when manifest is newer', () => {
    expect(isStale('img/w800-v900.webp', 1000)).toBe(true)
  })

  it('returns false when no version in key', () => {
    expect(isStale('img/w800.webp', 1000)).toBe(false)
  })
})
