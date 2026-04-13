import { eq, sql } from 'drizzle-orm'
import { type Database } from '../client'
import { tags, tagTranslations } from '../schema'
import type { TagDto } from '../types/dtos'

export interface CreateTagInput {
  slug: string
  label: string
  translations?: Record<string, string>
}

export type UpdateTagInput = Partial<CreateTagInput>

export class TagRepository {
  constructor(private db: Database) {}

  async getAll(locale?: string): Promise<TagDto[]> {
    const allTags = await this.db.select().from(tags).orderBy(tags.label)
    const trans = await this.db.select().from(tagTranslations)

    const transMap = new Map<string, Record<string, string>>()
    for (const t of trans) {
      if (!transMap.has(t.tagId)) transMap.set(t.tagId, {})
      transMap.get(t.tagId)![t.locale] = t.label
    }

    return allTags.map(tag => {
      const tr = transMap.get(tag.id) ?? {}
      return {
        id: tag.id,
        slug: tag.slug,
        label: (locale && tr[locale]) ? tr[locale] : tag.label,
        translations: tr,
      }
    })
  }

  async create(input: CreateTagInput): Promise<TagDto> {
    const id = crypto.randomUUID().replace(/-/g, '')
    const now = new Date().toISOString()

    await this.db.insert(tags).values({
      id,
      slug: input.slug,
      label: input.label,
      createdAt: now,
      updatedAt: now,
    })

    if (input.translations) {
      for (const [locale, label] of Object.entries(input.translations)) {
        await this.db.insert(tagTranslations).values({
          id: crypto.randomUUID().replace(/-/g, ''),
          tagId: id,
          locale,
          label,
          isAutoTranslated: 0,
          translatedAt: now,
        })
      }
    }

    return (await this.getById(id))!
  }

  async update(id: string, input: UpdateTagInput): Promise<TagDto | null> {
    const existing = await this.db.select().from(tags).where(eq(tags.id, id)).limit(1)
    if (existing.length === 0) return null

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() }
    if (input.slug !== undefined) updates.slug = input.slug
    if (input.label !== undefined) updates.label = input.label

    await this.db.update(tags).set(updates).where(eq(tags.id, id))

    if (input.translations) {
      await this.db.delete(tagTranslations).where(eq(tagTranslations.tagId, id))
      for (const [locale, label] of Object.entries(input.translations)) {
        await this.db.insert(tagTranslations).values({
          id: crypto.randomUUID().replace(/-/g, ''),
          tagId: id,
          locale,
          label,
          isAutoTranslated: 0,
          translatedAt: new Date().toISOString(),
        })
      }
    }

    return this.getById(id)
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.db.select().from(tags).where(eq(tags.id, id)).limit(1)
    if (existing.length === 0) return false
    await this.db.delete(tagTranslations).where(eq(tagTranslations.tagId, id))
    await this.db.delete(tags).where(eq(tags.id, id))
    return true
  }

  async getById(id: string): Promise<TagDto | null> {
    const rows = await this.db.select().from(tags).where(eq(tags.id, id)).limit(1)
    if (rows.length === 0) return null
    const tag = rows[0]
    const trans = await this.db.select().from(tagTranslations).where(eq(tagTranslations.tagId, id))
    const tr: Record<string, string> = {}
    for (const t of trans) tr[t.locale] = t.label
    return { id: tag.id, slug: tag.slug, label: tag.label, translations: tr }
  }
}
