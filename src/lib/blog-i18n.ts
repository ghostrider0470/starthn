import type { TFunction } from 'i18next'
import type { Tag } from '@/services/tag.service'
import type { Category } from '@/services/category.service'
import { BRAND } from '@/lib/business'

const readTimePattern = /(\d+)/
const rawIcuMonthPattern = /\bM\d{1,2}\b/

const blogPublishedDateOptions: Intl.DateTimeFormatOptions = {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
}

// Workers' ICU data has no usable Bosnian (or Serbian) month names, so these
// locales are formatted by hand instead of falling back to Croatian or English.
const BOSNIAN_MONTHS = [
  'januar',
  'februar',
  'mart',
  'april',
  'maj',
  'juni',
  'juli',
  'august',
  'septembar',
  'oktobar',
  'novembar',
  'decembar',
] as const

const SERBIAN_LATIN_MONTHS = [
  'januar',
  'februar',
  'mart',
  'april',
  'maj',
  'jun',
  'jul',
  'avgust',
  'septembar',
  'oktobar',
  'novembar',
  'decembar',
] as const

type LocalizableTerm = Pick<Category | Tag, 'slug' | 'label' | 'translations'>

/** Lowercase ASCII slug: 'Porezi i PDV' → 'porezi-i-pdv', 'Računovodstvo' → 'racunovodstvo'. */
function slugifyLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Find the category/tag a post refers to. Posts store either the label, the
 * slug, or (for older posts) the English label, sometimes with different case.
 */
function findTerm<T extends LocalizableTerm>(
  terms: Array<T>,
  labelOrSlug: string,
): T | undefined {
  if (!labelOrSlug) return undefined
  const exact = terms.find(
    (term) => term.label === labelOrSlug || term.slug === labelOrSlug,
  )
  if (exact) return exact

  const slugified = slugifyLabel(labelOrSlug)
  return terms.find(
    (term) =>
      term.translations['en-US'] === labelOrSlug ||
      (slugified !== '' && term.slug.toLowerCase() === slugified),
  )
}

function localizeTerm(
  terms: Array<LocalizableTerm>,
  labelOrSlug: string,
  locale: string,
): string {
  const term = findTerm(terms, labelOrSlug)
  if (!term) return labelOrSlug
  return term.translations[locale] || term.translations['en-US'] || term.label
}

export function localizeBlogCategory(categories: Array<Category>, labelOrSlug: string, locale: string): string {
  return localizeTerm(categories, labelOrSlug, locale)
}

export function localizeBlogTag(tags: Array<Tag>, labelOrSlug: string, locale: string): string {
  return localizeTerm(tags, labelOrSlug, locale)
}

/**
 * '4 min read' → the blog namespace's readTime string in the active locale.
 * The namespace is explicit because callers pass `t` from other namespaces.
 */
export function localizeBlogReadTime(t: TFunction, readTime: string | number): string {
  const str = String(readTime ?? '')
  const match = str.match(readTimePattern)
  if (!match) {
    return str
  }

  return t('blog:readTime', { minutes: match[1], defaultValue: `${match[1]} min read` })
}

export function formatBlogPublishedDate(date: string, locale = 'en-US'): string {
  if (!date) return ''

  const parsedDate = new Date(date.includes('T') ? date : `${date}T00:00:00Z`)
  if (Number.isNaN(parsedDate.getTime())) return ''

  const lang = locale.toLowerCase()
  if (lang.startsWith('bs') || lang.startsWith('sr')) {
    const months = lang.startsWith('bs') ? BOSNIAN_MONTHS : SERBIAN_LATIN_MONTHS
    return `${parsedDate.getUTCDate()}. ${months[parsedDate.getUTCMonth()]} ${parsedDate.getUTCFullYear()}.`
  }

  try {
    const formatted = parsedDate.toLocaleDateString(locale, blogPublishedDateOptions)

    // Cloudflare Workers can return raw ICU patterns such as "2025 M11 22"
    // for some locales. Use the same readable fallback as article pages.
    if (rawIcuMonthPattern.test(formatted)) {
      return parsedDate.toLocaleDateString('en-US', blogPublishedDateOptions)
    }

    return formatted
  } catch {
    return parsedDate.toLocaleDateString('en-US', blogPublishedDateOptions)
  }
}

/**
 * Display name for a post's author. `author_name` is nullable in D1, so a post
 * published without one is credited to the brand instead of crashing the
 * render (a null here used to throw during SSR and blank the blog index).
 */
export function blogAuthorName(author: string | null | undefined): string {
  const name = typeof author === 'string' ? author.trim() : ''
  return name || BRAND
}

/** Up to two uppercase initials for an author avatar fallback. */
export function blogAuthorInitials(author: string | null | undefined): string {
  return blogAuthorName(author)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
