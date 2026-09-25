import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCALE,
  getLocaleFromPath,
  resolveLocaleAlias,
  withLocalePath,
} from '@/lib/i18n-utils'

describe('DEFAULT_LOCALE', () => {
  it('is Bosnian, so prefix-less URLs resolve to bs-BA', () => {
    expect(DEFAULT_LOCALE).toBe('bs-BA')
    expect(getLocaleFromPath('/')).toBe('bs-BA')
    expect(withLocalePath('/services', DEFAULT_LOCALE)).toBe('/bs-BA/services')
  })

  it('keeps explicit locale prefixes', () => {
    expect(getLocaleFromPath('/en-US/services')).toBe('en-US')
  })
})

describe('resolveLocaleAlias', () => {
  it('returns valid locales unchanged', () => {
    expect(resolveLocaleAlias('en-US')).toBe('en-US')
    expect(resolveLocaleAlias('sr-Latn')).toBe('sr-Latn')
  })

  it('fixes casing', () => {
    expect(resolveLocaleAlias('en-us')).toBe('en-US')
    expect(resolveLocaleAlias('BS-BA')).toBe('bs-BA')
  })

  it('maps bare language codes to their locale', () => {
    expect(resolveLocaleAlias('en')).toBe('en-US')
    expect(resolveLocaleAlias('bs')).toBe('bs-BA')
    expect(resolveLocaleAlias('hr')).toBe('hr-HR')
  })

  it('rejects segments that are not locales', () => {
    expect(resolveLocaleAlias('o-nama')).toBeNull()
    expect(resolveLocaleAlias('kontakt')).toBeNull()
    expect(resolveLocaleAlias('services')).toBeNull()
    expect(resolveLocaleAlias(undefined)).toBeNull()
  })

  it('resolves the first segment of a bare-language path', () => {
    // "/en" is the path form; the server canonicalizer feeds its first segment.
    const [first] = '/en'.split('/').filter(Boolean)
    expect(resolveLocaleAlias(first)).toBe('en-US')
  })

  it('maps bare language codes of script-subtag locales', () => {
    expect(resolveLocaleAlias('sr')).toBe('sr-Latn')
    expect(resolveLocaleAlias('SR')).toBe('sr-Latn')
    expect(resolveLocaleAlias('zh')).toBe('zh-Hans')
  })

  it('fixes casing of script subtags too', () => {
    expect(resolveLocaleAlias('SR-latn')).toBe('sr-Latn')
    expect(resolveLocaleAlias('zh-hans')).toBe('zh-Hans')
  })

  it('keeps every visitor locale reachable (none is retired)', () => {
    expect(resolveLocaleAlias('de-DE')).toBe('de-DE')
    expect(resolveLocaleAlias('DE-de')).toBe('de-DE')
    expect(resolveLocaleAlias('de')).toBe('de-DE')
  })
})
