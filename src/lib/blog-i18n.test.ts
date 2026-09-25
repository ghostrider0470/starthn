import { createInstance } from 'i18next'
import { describe, expect, it } from 'vitest'
import {
  blogAuthorInitials,
  blogAuthorName,
  formatBlogPublishedDate,
  localizeBlogCategory,
  localizeBlogReadTime,
  localizeBlogTag,
} from './blog-i18n'
import type { Category } from '@/services/category.service'
import type { Tag } from '@/services/tag.service'

describe('formatBlogPublishedDate', () => {
  it('formats Bosnian dates by hand, never falling back to Croatian or English', () => {
    expect(formatBlogPublishedDate('2025-11-22', 'bs-BA')).toBe('22. novembar 2025.')
    expect(formatBlogPublishedDate('2025-08-01T10:00:00Z', 'bs-BA')).toBe('1. august 2025.')
    expect(formatBlogPublishedDate('2025-06-15', 'bs-BA')).toBe('15. juni 2025.')
  })

  it('uses Serbian month names for sr-Latn', () => {
    expect(formatBlogPublishedDate('2025-08-01', 'sr-Latn')).toBe('1. avgust 2025.')
  })

  it('keeps Intl formatting for other locales', () => {
    expect(formatBlogPublishedDate('2025-11-22', 'en-US')).toBe('November 22, 2025')
  })

  it('returns an empty string for missing or invalid dates', () => {
    expect(formatBlogPublishedDate('', 'bs-BA')).toBe('')
    expect(formatBlogPublishedDate('not-a-date', 'bs-BA')).toBe('')
  })
})

describe('localizeBlogReadTime', () => {
  it('reads the readTime string from the blog namespace, whatever namespace t is bound to', async () => {
    const i18n = createInstance()
    await i18n.init({
      lng: 'bs-BA',
      resources: {
        'bs-BA': {
          blog: { readTime: '{{minutes}} min čitanja' },
          pages: {},
        },
      },
      interpolation: { escapeValue: false },
    })

    const tPages = i18n.getFixedT('bs-BA', 'pages')
    expect(localizeBlogReadTime(tPages, '4 min read')).toBe('4 min čitanja')
  })

  it('returns non-numeric values unchanged', async () => {
    const i18n = createInstance()
    await i18n.init({ lng: 'en-US', resources: {} })
    expect(localizeBlogReadTime(i18n.t, 'soon')).toBe('soon')
  })
})

describe('localizeBlogCategory / localizeBlogTag', () => {
  const categories: Array<Category> = [
    {
      id: '1',
      slug: 'preduzetnistvo',
      lang: 'bs-BA',
      label: 'Preduzetništvo',
      translations: {
        'bs-BA': 'Preduzetništvo',
        'en-US': 'Entrepreneurship',
        'hr-HR': 'Poduzetništvo',
      },
      parentId: null,
    },
  ]

  const tags: Array<Tag> = [
    {
      id: 't1',
      slug: 'porezi-i-pdv',
      lang: 'bs-BA',
      label: 'Porezi i PDV',
      translations: { 'en-US': 'Taxes and VAT' },
    },
  ]

  it('maps an English category label to the translation for the locale', () => {
    expect(localizeBlogCategory(categories, 'Entrepreneurship', 'bs-BA')).toBe(
      'Preduzetništvo',
    )
    expect(localizeBlogCategory(categories, 'Entrepreneurship', 'hr-HR')).toBe(
      'Poduzetništvo',
    )
  })

  it('still matches by label and slug', () => {
    expect(localizeBlogCategory(categories, 'preduzetnistvo', 'en-US')).toBe(
      'Entrepreneurship',
    )
    expect(localizeBlogCategory(categories, 'Preduzetništvo', 'en-US')).toBe(
      'Entrepreneurship',
    )
  })

  it('matches a raw or differently cased value against the slug', () => {
    expect(localizeBlogTag(tags, 'Porezi-I-PDV', 'en-US')).toBe('Taxes and VAT')
    expect(localizeBlogCategory(categories, 'PREDUZETNIŠTVO', 'hr-HR')).toBe(
      'Poduzetništvo',
    )
  })

  it('falls back to en-US, then the label, and returns unknown values unchanged', () => {
    expect(localizeBlogTag(tags, 'porezi-i-pdv', 'de-DE')).toBe('Taxes and VAT')
    expect(localizeBlogTag(tags, 'Unknown tag', 'bs-BA')).toBe('Unknown tag')
  })
})

describe('blogAuthorName / blogAuthorInitials', () => {
  it('falls back to the brand for a missing or blank author', () => {
    expect(blogAuthorName(null)).toBe('Start HN')
    expect(blogAuthorName(undefined)).toBe('Start HN')
    expect(blogAuthorName('   ')).toBe('Start HN')
    expect(blogAuthorInitials(null)).toBe('SH')
  })

  it('keeps a real author name and derives up to two initials', () => {
    expect(blogAuthorName(' Amra Hodžić ')).toBe('Amra Hodžić')
    expect(blogAuthorInitials('Amra  Hodžić')).toBe('AH')
    expect(blogAuthorInitials('Amra Hodžić Begić')).toBe('AH')
    expect(blogAuthorInitials('amra')).toBe('A')
  })
})
