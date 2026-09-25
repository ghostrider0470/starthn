import { describe, expect, it } from 'vitest'
import {
  DEV_STYLES_ATTR,
  selectHeadTags,
  withLowPriorityModulePreload,
} from './PrioritizedHeadContent'

describe('withLowPriorityModulePreload', () => {
  it('lowers the priority of module preloads', () => {
    const tag = {
      tag: 'link' as const,
      attrs: { rel: 'modulepreload', href: '/assets/main-abc.js' },
    }
    expect(withLowPriorityModulePreload(tag)).toEqual({
      tag: 'link',
      attrs: {
        rel: 'modulepreload',
        href: '/assets/main-abc.js',
        fetchPriority: 'low',
      },
    })
    // The input is not modified.
    expect(tag.attrs).not.toHaveProperty('fetchPriority')
  })

  it('leaves the stylesheet, the LCP image preload and other tags alone', () => {
    const tags = [
      {
        tag: 'link' as const,
        attrs: { rel: 'stylesheet', href: '/assets/styles.css' },
      },
      {
        tag: 'link' as const,
        attrs: {
          rel: 'preload',
          as: 'image',
          href: '/hero.webp',
          fetchPriority: 'high',
        },
      },
      { tag: 'meta' as const, attrs: { name: 'description', content: 'x' } },
      { tag: 'title' as const, children: 'Start HN' },
    ]
    for (const tag of tags) expect(withLowPriorityModulePreload(tag)).toBe(tag)
  })
})

describe('selectHeadTags', () => {
  const devStyles = {
    tag: 'link' as const,
    attrs: {
      rel: 'stylesheet',
      href: '/@tanstack-start/styles.css?routes=__root__',
      [DEV_STYLES_ATTR]: 'true',
    },
  }
  const styles = {
    tag: 'link' as const,
    attrs: { rel: 'stylesheet', href: '/src/styles.css' },
  }
  const preload = {
    tag: 'link' as const,
    attrs: { rel: 'modulepreload', href: '/assets/main.js' },
  }

  it('keeps the dev-styles link before hydration (SSR markup must match)', () => {
    const out = selectHeadTags([devStyles, styles], false)
    expect(out).toEqual([devStyles, styles])
  })

  it('drops the dev-styles link once hydrated', () => {
    const out = selectHeadTags([devStyles, styles], true)
    expect(out).toEqual([styles])
  })

  it('lowers module preload priority in both phases', () => {
    for (const hydrated of [false, true]) {
      const [tag] = selectHeadTags([preload], hydrated)
      expect(tag.attrs?.fetchPriority).toBe('low')
    }
  })
})
