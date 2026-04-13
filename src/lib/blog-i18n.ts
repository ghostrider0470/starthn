import type { TFunction } from 'i18next'
import type { Tag } from '@/services/tag.service'
import type { Category } from '@/services/category.service'

const readTimePattern = /(\d+)/

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
