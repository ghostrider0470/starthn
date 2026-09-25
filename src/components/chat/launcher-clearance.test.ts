import { describe, expect, it } from 'vitest'
import { launcherBox, rootMarginFor } from './launcher-clearance'

describe('launcherBox', () => {
  it('sits bottom-right on LTR phones, above the bottom nav', () => {
    // 320x568: right-6 (24px), bottom-24 (96px), 56px square.
    expect(launcherBox(320, 568, { rtl: false, desktop: false })).toEqual({
      left: 240,
      right: 296,
      top: 416,
      bottom: 472,
    })
  })

  it('mirrors to the left in RTL', () => {
    expect(launcherBox(320, 568, { rtl: true, desktop: false })).toEqual({
      left: 24,
      right: 80,
      top: 416,
      bottom: 472,
    })
  })

  it('drops to bottom-6 from md', () => {
    expect(launcherBox(1024, 768, { rtl: false, desktop: true })).toEqual({
      left: 944,
      right: 1000,
      top: 688,
      bottom: 744,
    })
  })
})

describe('rootMarginFor', () => {
  it('shrinks the viewport to the launcher box (top right bottom left)', () => {
    const box = launcherBox(375, 812, { rtl: false, desktop: false })
    expect(rootMarginFor(box, 375, 812)).toBe('-660px -24px -96px -295px')
  })

  it('never produces a positive (growing) margin', () => {
    const margin = rootMarginFor(
      { left: -10, right: 400, top: -5, bottom: 900 },
      375,
      812,
    )
    expect(margin).toBe('0px 0px 0px 0px')
  })
})
