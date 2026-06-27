import type { TFunction } from 'i18next'
import type { Tag } from '@/services/tag.service'
import type { Category } from '@/services/category.service'

const readTimePattern = /(\d+)/
const rawIcuMonthPattern = /\bM\d{1,2}\b/

const blogPublishedDateOptions: Intl.DateTimeFormatOptions = {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
}

export function localizeBlogCategory(categories: Category[], labelOrSlug: string, locale: string): string {
  const cat = categories.find((c) => c.label === labelOrSlug || c.slug === labelOrSlug)
  if (!cat) return labelOrSlug
  return cat.translations[locale] ?? cat.translations['en-US'] ?? cat.label
}

export function localizeBlogTag(tags: Tag[], labelOrSlug: string, locale: string): string {
  const tag = tags.find((t) => t.label === labelOrSlug || t.slug === labelOrSlug)
  if (!tag) return labelOrSlug
  return tag.translations[locale] ?? tag.translations['en-US'] ?? tag.label
}

export function localizeBlogReadTime(t: TFunction, readTime: string | number): string {
  const str = String(readTime ?? '')
  const match = str.match(readTimePattern)
  if (!match) {
    return str
  }

  return t('readTime', { minutes: match[1], defaultValue: `${match[1]} min read` })
}

export function formatBlogPublishedDate(date: string, locale = 'en-US'): string {
  if (!date) return ''

  const parsedDate = new Date(date.includes('T') ? date : `${date}T00:00:00Z`)
  if (Number.isNaN(parsedDate.getTime())) return ''

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
