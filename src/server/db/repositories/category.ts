import { eq, sql } from 'drizzle-orm'
import { type Database } from '../client'
import { categories, categoryTranslations } from '../schema'
import type { CategoryDto } from '../types/dtos'

export interface CreateCategoryInput {
  slug: string
  label: string
  parentId?: string | null
  translations?: Record<string, string>
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>

export class CategoryRepository {
  constructor(private db: Database) {}

  async getAll(locale?: string): Promise<CategoryDto[]> {
    const cats = await this.db.select().from(categories).orderBy(categories.label)
    const trans = await this.db.select().from(categoryTranslations)

    const transMap = new Map<string, Record<string, string>>()
    for (const t of trans) {
      if (!transMap.has(t.categoryId)) transMap.set(t.categoryId, {})
      transMap.get(t.categoryId)![t.locale] = t.label
    }

    return cats.map(c => {
      const tr = transMap.get(c.id) ?? {}
      return {
        id: c.id,
        slug: c.slug,
        label: (locale && tr[locale]) ? tr[locale] : c.label,
        parentId: c.parentId,
        translations: tr,
      }
    })
  }

  async create(input: CreateCategoryInput): Promise<CategoryDto> {
    const id = crypto.randomUUID().replace(/-/g, '')
    const now = new Date().toISOString()

    await this.db.insert(categories).values({
      id,
      slug: input.slug,
      label: input.label,
      parentId: input.parentId ?? null,
      createdAt: now,
      updatedAt: now,
    })

    if (input.translations) {
      for (const [locale, label] of Object.entries(input.translations)) {
        await this.db.insert(categoryTranslations).values({
          id: crypto.randomUUID().replace(/-/g, ''),
          categoryId: id,
          locale,
          label,
          isAutoTranslated: 0,
          translatedAt: now,
        })
      }
    }

    return (await this.getById(id))!
  }

  async update(id: string, input: UpdateCategoryInput): Promise<CategoryDto | null> {
    const existing = await this.db.select().from(categories).where(eq(categories.id, id)).limit(1)
    if (existing.length === 0) return null

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() }
    if (input.slug !== undefined) updates.slug = input.slug
    if (input.label !== undefined) updates.label = input.label
    if (input.parentId !== undefined) updates.parentId = input.parentId

    await this.db.update(categories).set(updates).where(eq(categories.id, id))

    if (input.translations) {
      // Replace all translations
      await this.db.delete(categoryTranslations).where(eq(categoryTranslations.categoryId, id))
      for (const [locale, label] of Object.entries(input.translations)) {
        await this.db.insert(categoryTranslations).values({
          id: crypto.randomUUID().replace(/-/g, ''),
          categoryId: id,
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
    const existing = await this.db.select().from(categories).where(eq(categories.id, id)).limit(1)
    if (existing.length === 0) return false
    await this.db.delete(categoryTranslations).where(eq(categoryTranslations.categoryId, id))
    await this.db.delete(categories).where(eq(categories.id, id))
    return true
  }

  async getById(id: string): Promise<CategoryDto | null> {
    const rows = await this.db.select().from(categories).where(eq(categories.id, id)).limit(1)
    if (rows.length === 0) return null
    const c = rows[0]
    const trans = await this.db.select().from(categoryTranslations).where(eq(categoryTranslations.categoryId, id))
    const tr: Record<string, string> = {}
    for (const t of trans) tr[t.locale] = t.label
    return { id: c.id, slug: c.slug, label: c.label, parentId: c.parentId, translations: tr }
  }
}
