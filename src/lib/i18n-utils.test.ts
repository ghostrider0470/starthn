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
    expect(resolveLocaleAlias('services')).toBeNull()
    expect(resolveLocaleAlias(undefined)).toBeNull()
  })
})
