import { describe, expect, it } from 'vitest'
import {
  BLOG_HERO_IMAGE_SIZES,
  WHY_START_HN_IMAGE_SIZES,
  img,
  imgSrcSet,
} from './image'

describe('img() with /img/ proxy URLs', () => {
  it('adds the requested width to an /img/ URL', () => {
    const url = img('/img/blog-images/abc', { width: 400 })
    expect(url).toContain('?w=400')
    expect(url.startsWith('/img/blog-images/abc')).toBe(true)
  })

  it('replaces an existing ?w= instead of duplicating it', () => {
    const url = img('/img/blog-images/abc.webp?w=2000&f=auto', { width: 800 })
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.getAll('w')).toEqual(['800'])
    expect(params.get('f')).toBe('auto')
  })

  it('merges quality and format', () => {
    const url = img('/img/blog-images/abc.webp', {
      width: 400,
      quality: 70,
      format: 'avif',
    })
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('w')).toBe('400')
    expect(params.get('q')).toBe('70')
    expect(params.get('f')).toBe('avif')
  })

  it('returns an /img/ URL unchanged when no options are given', () => {
    expect(img('/img/blog-images/abc.webp')).toBe('/img/blog-images/abc.webp')
    expect(img('/img/blog-images/abc.webp?w=400')).toBe(
      '/img/blog-images/abc.webp?w=400',
    )
  })

  it('produces a distinct URL for every srcSet width', () => {
    const widths = [400, 800, 1200]
    const srcSet = imgSrcSet('/img/blog-images/abc.webp', widths)
    const urls = srcSet.split(', ').map((entry) => entry.split(' ')[0])
    expect(urls).toHaveLength(widths.length)
    expect(new Set(urls).size).toBe(widths.length)
    widths.forEach((w, i) => expect(urls[i]).toContain(`w=${w}`))
  })
})

describe('img() with container-relative paths', () => {
  it('builds an /img/ URL with the requested params', () => {
    expect(img('blog-images/abc.webp', { width: 400, format: 'auto' })).toBe(
      '/img/blog-images/abc.webp?w=400&f=auto',
    )
  })

  it('returns empty string for empty input and unknown formats as-is', () => {
    expect(img(null)).toBe('')
    expect(img('/hero/slide-1.webp', { width: 400 })).toBe('/hero/slide-1.webp')
  })
})

describe('responsive image `sizes`', () => {
  // The slot width a `sizes` list resolves to for a viewport, evaluating the
  // subset of media conditions and lengths the constants use.
  function slotWidth(sizes: string, vw: number, vh: number): number {
    for (const entry of sizes.split(/,\s*(?![^(]*\))/)) {
      const match = /^\((min|max)-(width|height):\s*(\d+)px\)\s+(.+)$/.exec(entry)
      const length = match ? match[4] : entry
      if (match) {
        const value = match[2] === 'width' ? vw : vh
        const limit = Number(match[3])
        if (match[1] === 'min' ? value < limit : value > limit) continue
      }
      const expr = length
        .replace(/^calc\((.+)\)$/, '$1')
        .replace(/([\d.]+)vw/g, (_, n) => String((Number(n) * vw) / 100))
        .replace(/([\d.]+)vh/g, (_, n) => String((Number(n) * vh) / 100))
        .replace(/([\d.]+)rem/g, (_, n) => String(Number(n) * 16))
        .replace(/px/g, '')
      return Function(`return (${expr})`)() as number
    }
    throw new Error('no match')
  }

  it('sizes the blog hero to the 1024px post column', () => {
    expect(slotWidth(BLOG_HERO_IMAGE_SIZES, 1350, 940)).toBe(1024)
    expect(slotWidth(BLOG_HERO_IMAGE_SIZES, 1050, 800)).toBe(986)
    expect(slotWidth(BLOG_HERO_IMAGE_SIZES, 768, 1024)).toBe(720)
    expect(slotWidth(BLOG_HERO_IMAGE_SIZES, 412, 823)).toBe(380)
  })

  it('sizes the "Why Start HN" photo to its rendered box', () => {
    // Lighthouse mobile (412x823 @1.75x) → 342px → the 600w file.
    expect(slotWidth(WHY_START_HN_IMAGE_SIZES, 412, 823)).toBeCloseTo(342.4, 0)
    expect(slotWidth(WHY_START_HN_IMAGE_SIZES, 412, 823) * 1.75).toBeLessThanOrEqual(600)
    expect(slotWidth(WHY_START_HN_IMAGE_SIZES, 360, 640)).toBe(288)
    expect(slotWidth(WHY_START_HN_IMAGE_SIZES, 820, 1180)).toBe(400)
    expect(slotWidth(WHY_START_HN_IMAGE_SIZES, 1024, 768)).toBeCloseTo(376.7, 0)
    expect(slotWidth(WHY_START_HN_IMAGE_SIZES, 1440, 900)).toBe(484)
  })
})
