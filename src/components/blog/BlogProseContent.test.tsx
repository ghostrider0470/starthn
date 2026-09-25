import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BlogProseContent, optimizeProseImages } from './BlogProseContent'

function parseImg(html: string): HTMLImageElement {
  const container = document.createElement('div')
  container.innerHTML = html
  const image = container.querySelector('img')
  if (!image) throw new Error('no <img> in output')
  return image
}

describe('optimizeProseImages', () => {
  it('adds lazy loading and async decoding when missing', () => {
    const image = parseImg(optimizeProseImages('<p><img src="https://example.com/a.webp" alt="Tim Start HN"></p>'))

    expect(image.getAttribute('loading')).toBe('lazy')
    expect(image.getAttribute('decoding')).toBe('async')
    expect(image.getAttribute('alt')).toBe('Tim Start HN')
    expect(image.getAttribute('src')).toBe('https://example.com/a.webp')
    expect(image.hasAttribute('srcset')).toBe(false)
  })

  it('keeps loading and decoding values the author already set', () => {
    const image = parseImg(optimizeProseImages('<img src="/x.webp" loading="eager" decoding="sync" alt="">'))

    expect(image.getAttribute('loading')).toBe('eager')
    expect(image.getAttribute('decoding')).toBe('sync')
  })

  it('resizes /img/ proxy images and adds a 400/800/1200 srcset', () => {
    const image = parseImg(optimizeProseImages('<img src="/img/blog-images/post/cover.webp" alt="Naslovna">'))

    expect(image.getAttribute('src')).toBe('/img/blog-images/post/cover.webp?w=1200&f=auto')
    const srcset = image.getAttribute('srcset') ?? ''
    expect(srcset).toContain('/img/blog-images/post/cover.webp?w=400&f=auto 400w')
    expect(srcset).toContain('/img/blog-images/post/cover.webp?w=800&f=auto 800w')
    expect(srcset).toContain('/img/blog-images/post/cover.webp?w=1200&f=auto 1200w')
    expect(image.getAttribute('sizes')).toBe('(max-width: 768px) 100vw, 768px')
  })

  it('writes the query-string ampersands HTML-encoded', () => {
    const out = optimizeProseImages('<img src="/img/blog-images/a.webp">')

    expect(out).toContain('src="/img/blog-images/a.webp?w=1200&amp;f=auto"')
  })

  it('leaves /img/ URLs that already request a width alone', () => {
    const image = parseImg(optimizeProseImages('<img src="/img/blog-images/a.webp?q=80&amp;w=640" alt="">'))

    expect(image.getAttribute('src')).toBe('/img/blog-images/a.webp?q=80&w=640')
    expect(image.hasAttribute('srcset')).toBe(false)
  })

  it('blanks alts that are only an image filename', () => {
    const html =
      '<img src="/a.webp" alt="2.webp"><img src="/b.png" alt="Screenshot-2025-08-19-155444-scaled-e1755611764902.png"><img src="/c.jpg" alt="Selma Hadžić na N1">'
    const container = document.createElement('div')
    container.innerHTML = optimizeProseImages(html)
    const alts = Array.from(container.querySelectorAll('img')).map((node) => node.getAttribute('alt'))

    expect(alts).toEqual(['', '', 'Selma Hadžić na N1'])
  })

  it('does not treat data-src or srcset as the src attribute', () => {
    const image = parseImg(
      optimizeProseImages('<img data-src="/img/blog-images/lazy.webp" src="https://cdn.example.com/a.jpg" alt="">'),
    )

    expect(image.getAttribute('src')).toBe('https://cdn.example.com/a.jpg')
    expect(image.getAttribute('data-src')).toBe('/img/blog-images/lazy.webp')
  })

  it('handles self-closing tags and quoted ">" inside attributes', () => {
    const out = optimizeProseImages('<img alt="a > b" src="/img/blog-images/a.webp" />')
    const image = parseImg(out)

    expect(out.startsWith('<img alt="a > b"')).toBe(true)
    expect(out.endsWith(' />')).toBe(true)
    expect(image.getAttribute('alt')).toBe('a > b')
    expect(image.getAttribute('loading')).toBe('lazy')
  })

  it('returns HTML without images unchanged', () => {
    const html = '<p>Bez slika</p>'
    expect(optimizeProseImages(html)).toBe(html)
  })
})

describe('BlogProseContent', () => {
  it('renders the rewritten image markup', () => {
    const { container } = render(
      <BlogProseContent content={['<p>Tekst</p><img src="/img/blog-images/a.webp" alt="1.jpg">']} />,
    )
    const image = container.querySelector('img')

    expect(image?.getAttribute('loading')).toBe('lazy')
    expect(image?.getAttribute('alt')).toBe('')
    expect(image?.getAttribute('src')).toBe('/img/blog-images/a.webp?w=1200&f=auto')
  })
})
