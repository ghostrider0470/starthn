import { describe, expect, it } from 'vitest'
import { img, imgSrcSet } from './image'

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
