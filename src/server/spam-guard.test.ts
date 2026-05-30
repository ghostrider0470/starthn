import { describe, expect, it } from 'vitest'
import { isHackSpam } from './spam-guard'

describe('isHackSpam', () => {
  it('matches injected /items/ paths (bare and locale-prefixed)', () => {
    expect(isHackSpam('/items/Y156399317')).toBe(true)
    expect(isHackSpam('/items/Y156399317/')).toBe(true)
    expect(isHackSpam('/en-US/items/foo')).toBe(true)
    expect(isHackSpam('/bs/items/anything/deep')).toBe(true)
  })

  it('matches bare injected letter+digit IDs across locale forms', () => {
    expect(isHackSpam('/en-US/B471837416')).toBe(true)
    expect(isHackSpam('/bs/Y156399317')).toBe(true)
    expect(isHackSpam('/zh-Hans/X1234567')).toBe(true)
    expect(isHackSpam('/sr-Latn/Z9999999')).toBe(true)
    expect(isHackSpam('/B471837416')).toBe(true)
    expect(isHackSpam('/en-US/B471837416/')).toBe(true)
  })

  it('does NOT match legitimate routes', () => {
    expect(isHackSpam('/')).toBe(false)
    expect(isHackSpam('/en-US')).toBe(false)
    expect(isHackSpam('/en-US/services')).toBe(false)
    expect(isHackSpam('/en-US/services/tax-consulting')).toBe(false)
    expect(isHackSpam('/en-US/blog/how-to-start-a-business-in-bih')).toBe(false)
    expect(isHackSpam('/en-US/team/jan-horvat')).toBe(false)
    expect(isHackSpam('/bs/about')).toBe(false)
    expect(isHackSpam('/sitemap.xml')).toBe(false)
    expect(isHackSpam('/sitemap-en-US.xml')).toBe(false)
    expect(isHackSpam('/robots.txt')).toBe(false)
    expect(isHackSpam('/api/blog')).toBe(false)
  })

  it('does NOT match real slugs that merely contain digits or capitals', () => {
    // word slug with a number — not the letter+6digits shape
    expect(isHackSpam('/en-US/blog/top-5-tax-tips')).toBe(false)
    // a single letter + too few digits
    expect(isHackSpam('/en-US/B4718')).toBe(false)
    // letter+digits but not the final segment (deeper legit path)
    expect(isHackSpam('/en-US/B471837416/details')).toBe(false)
  })
})
