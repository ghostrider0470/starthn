import { beforeAll, describe, expect, it } from 'vitest'
import { getSectionLabels } from './section-labels'
import i18n from '@/i18n'

describe('getSectionLabels', () => {
  beforeAll(() => {
    i18n.addResourceBundle(
      'bs-BA',
      'common',
      { sections: { home: 'Početna', services: 'Usluge', faq: 'Pitanja' } },
      true,
      true,
    )
    i18n.addResourceBundle(
      'hr-HR',
      'common',
      { sections: { home: 'Početna', services: 'Usluge' } },
      true,
      true,
    )
    i18n.addResourceBundle(
      'en-US',
      'common',
      { sections: { home: 'Home', services: 'Services', faq: 'FAQ' } },
      true,
      true,
    )
  })

  it('returns the labels in the requested locale, in key order', () => {
    expect(getSectionLabels('en-US', ['services', 'home', 'faq'])).toEqual([
      'Services',
      'Home',
      'FAQ',
    ])
    expect(getSectionLabels('bs-BA', ['home', 'services', 'faq'])).toEqual([
      'Početna',
      'Usluge',
      'Pitanja',
    ])
  })

  it('pins the language regardless of the shared instance language', async () => {
    await i18n.changeLanguage('en-US')
    expect(getSectionLabels('bs-BA', ['home'])).toEqual(['Početna'])
  })

  it('returns an empty label instead of a raw key or another locale', () => {
    // hr-HR has no `faq`: no fallback to bs-BA, no "sections.faq" leak.
    expect(getSectionLabels('hr-HR', ['home', 'faq'])).toEqual(['Početna', ''])
  })

  it('falls back to the default locale for an unknown locale code', () => {
    expect(getSectionLabels('xx-YY', ['services'])).toEqual(['Usluge'])
  })
})
