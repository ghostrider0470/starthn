import { describe, it, expect } from 'vitest'
import { convertToWebpVariants, TARGET_WIDTHS } from './image-convert'

// Minimal 3x3 red PNG as a test fixture
const TINY_PNG = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 3, 0, 0,
  0, 3, 8, 2, 0, 0, 0, 217, 74, 34, 232, 0, 0, 0, 21, 73, 68, 65, 84, 120, 156,
  99, 248, 207, 192, 192, 192, 240, 255, 255, 63, 3, 0, 14, 7, 3, 1, 255, 199, 255,
  10, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
])

// TODO: These tests require OffscreenCanvas + Web Worker support, which jsdom does
// not polyfill. Verified manually in-browser during Task 8 integration. Re-enable
// under a browser-based test runner (e.g. @vitest/browser with playwright) when
// the admin editor gains E2E coverage.
describe('convertToWebpVariants', () => {
  it.skip('generates one variant per target width', async () => {
    const file = new File([TINY_PNG], 'test.png', { type: 'image/png' })
    const variants = await convertToWebpVariants(file)
    expect(variants).toHaveLength(TARGET_WIDTHS.length)
  })

  it.skip('each variant is a webp Blob tagged with the width', async () => {
    const file = new File([TINY_PNG], 'test.png', { type: 'image/png' })
    const variants = await convertToWebpVariants(file)
    for (const v of variants) {
      expect(v.blob.type).toBe('image/webp')
      expect(TARGET_WIDTHS).toContain(v.width)
      expect(v.blob.size).toBeGreaterThan(0)
    }
  })

  it('exports the expected target widths', () => {
    // Lightweight sanity check that runs without browser APIs, so we catch
    // accidental regressions to the TARGET_WIDTHS constant in unit tests.
    expect(TARGET_WIDTHS).toEqual([400, 800, 1200, 1600, 2000])
  })
})
