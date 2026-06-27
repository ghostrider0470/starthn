import { eq, desc, sql, and, like, isNotNull } from 'drizzle-orm'
import { parseJson, type Database } from '../client'
import { blogPosts, blogPostTranslations, blogPostTags, categories, tags, users } from '../schema'
import type { BlogPostDto } from '../types/dtos'

export interface BlogPostFilters {
  category?: string
  subcategory?: string
  tag?: string
  q?: string
}

export interface CreateBlogPostInput {
  slug?: string
  lang?: string
  title: string
  excerpt?: string
  content: string[]
  isPublished: boolean
  isFeatured?: boolean
  publishedAt?: string
  readTime?: number
  category?: string
  subcategory?: string
  coverImage?: string
  bannerImage?: string
  tags?: string[]
}

export type UpdateBlogPostInput = Partial<CreateBlogPostInput>

export class BlogPostRepository {
  constructor(private db: Database) {}

  async getPublished(locale?: string, page = 1, pageSize = 10, filters: BlogPostFilters = {}): Promise<BlogPostDto[]> {
    const offset = (page - 1) * pageSize
    const loc = locale ?? 'en-US'

    const rows = await this.db
      .select()
      .from(blogPosts)
      .leftJoin(blogPostTranslations, and(
        eq(blogPostTranslations.postId, blogPosts.id),
        eq(blogPostTranslations.locale, loc),
      ))
      .leftJoin(users, eq(users.id, blogPosts.authorId))
      .where(this.buildPublishedWhere(filters))
      .orderBy(desc(blogPosts.isFeatured), desc(blogPosts.publishedAt))
      .limit(pageSize)
      .offset(offset)

    return Promise.all(rows.map(r => this.toDto(
      r.blog_posts,
      r.blog_post_translations,
      r.users?.avatarUrl,
      r.users?.slug,
    )))
  }

  async getBySlug(slug: string, locale?: string): Promise<BlogPostDto | null> {
    const loc = locale ?? 'en-US'

    const rows = await this.db
      .select()
      .from(blogPosts)
      .leftJoin(blogPostTranslations, and(
        eq(blogPostTranslations.postId, blogPosts.id),
        eq(blogPostTranslations.locale, loc),
      ))
      .leftJoin(users, eq(users.id, blogPosts.authorId))
      .where(eq(blogPosts.slug, slug))
      .limit(1)

    if (rows.length === 0) return null

    const post = rows[0].blog_posts

    // Return null (fall through to Azure) if the requested locale is not the
    // post's native language and no translation row exists in D1.
    const requestedLocale = locale ?? 'en-US'
    const postLang = post.lang ?? 'en-US'
    const isNativeLanguage = requestedLocale === postLang
    if (!isNativeLanguage && rows[0].blog_post_translations === null) return null

    return this.toDto(
      post,
      rows[0].blog_post_translations,
      rows[0].users?.avatarUrl,
      rows[0].users?.slug,
    )
  }

  async getAll(): Promise<BlogPostDto[]> {
    const rows = await this.db
      .select()
      .from(blogPosts)
      .orderBy(desc(blogPosts.createdAt))

    return Promise.all(rows.map(r => this.toDto(r)))
  }

  async getCount(filters: BlogPostFilters = {}): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(blogPosts)
      .where(this.buildPublishedWhere(filters))
    return result[0]?.count ?? 0
  }

  /** Admin: get all posts (published + drafts) */
  async getAllAdmin(page = 1, pageSize = 50): Promise<BlogPostDto[]> {
    const offset = (page - 1) * pageSize
    const rows = await this.db
      .select()
      .from(blogPosts)
      .orderBy(desc(blogPosts.createdAt))
      .limit(pageSize)
      .offset(offset)
    return Promise.all(rows.map(r => this.toDto(r)))
  }

  async create(input: CreateBlogPostInput, authorId?: string, authorName?: string): Promise<BlogPostDto> {
    const slug = input.slug || this.slugify(input.title)
    const id = crypto.randomUUID().replace(/-/g, '')
    const now = new Date().toISOString()

    await this.db.insert(blogPosts).values({
      id,
      slug,
      lang: input.lang ?? 'en-US',
      title: input.title,
      excerpt: input.excerpt ?? null,
      content: JSON.stringify(input.content),
      isPublished: input.isPublished ? 1 : 0,
      isFeatured: input.isFeatured ? 1 : 0,
      publishedAt: input.isPublished ? (input.publishedAt ?? now) : input.publishedAt ?? null,
      readTime: input.readTime ?? null,
      category: input.category ?? null,
      subcategory: input.subcategory ?? null,
      coverImage: input.coverImage ?? null,
      bannerImage: input.bannerImage ?? null,
      authorId: authorId ?? null,
      authorName: authorName ?? null,
      createdAt: now,
      updatedAt: now,
    })

    // Insert tag associations
    if (input.tags?.length) {
      await this.syncTags(id, input.tags)
    }

    return (await this.getBySlug(slug, input.lang ?? 'en-US'))!
  }

  async update(slug: string, input: UpdateBlogPostInput): Promise<BlogPostDto | null> {
    const existing = await this.db.select({ id: blogPosts.id, lang: blogPosts.lang }).from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1)
    if (existing.length === 0) return null
    const postId = existing[0].id

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() }
    if (input.lang !== undefined) updates.lang = input.lang
    if (input.title !== undefined) updates.title = input.title
    if (input.slug !== undefined) updates.slug = input.slug
    if (input.excerpt !== undefined) updates.excerpt = input.excerpt
    if (input.content !== undefined) updates.content = JSON.stringify(input.content)
    if (input.isPublished !== undefined) updates.isPublished = input.isPublished ? 1 : 0
    if (input.isFeatured !== undefined) updates.isFeatured = input.isFeatured ? 1 : 0
    if (input.publishedAt !== undefined) updates.publishedAt = input.publishedAt
    if (input.readTime !== undefined) updates.readTime = input.readTime
    if (input.category !== undefined) updates.category = input.category
    if (input.subcategory !== undefined) updates.subcategory = input.subcategory
    if (input.coverImage !== undefined) updates.coverImage = input.coverImage
    if (input.bannerImage !== undefined) updates.bannerImage = input.bannerImage

    await this.db.update(blogPosts).set(updates).where(eq(blogPosts.id, postId))

    // When lang changes, the post itself becomes the content in that language.
    // Delete any same-locale translation row that would shadow it.
    if (input.lang !== undefined) {
      await this.db.delete(blogPostTranslations)
        .where(and(eq(blogPostTranslations.postId, postId), eq(blogPostTranslations.locale, input.lang)))
    }

    if (input.tags !== undefined) {
      await this.syncTags(postId, input.tags)
    }

    const finalSlug = input.slug ?? slug
    const finalLang = input.lang ?? existing[0].lang ?? 'en-US'
    return this.getBySlug(finalSlug, finalLang)
  }

  async delete(slug: string): Promise<boolean> {
    const existing = await this.db.select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1)
    if (existing.length === 0) return false
    const postId = existing[0].id

    // Cascade deletes handle tags and translations via FK
    await this.db.delete(blogPostTags).where(eq(blogPostTags.postId, postId))
    await this.db.delete(blogPostTranslations).where(eq(blogPostTranslations.postId, postId))
    await this.db.delete(blogPosts).where(eq(blogPosts.id, postId))
    return true
  }

  /** Get translations for a post */
  async getTranslations(slug: string): Promise<Record<string, any> | null> {
    const post = await this.db.select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1)
    if (post.length === 0) return null

    const trans = await this.db.select().from(blogPostTranslations).where(eq(blogPostTranslations.postId, post[0].id))
    const result: Record<string, any> = {}
    for (const t of trans) {
      result[t.locale] = {
        title: t.title,
        excerpt: t.excerpt,
        content: parseJson(t.content, []),
        isAutoTranslated: t.isAutoTranslated === 1,
        translatedAt: t.translatedAt,
      }
    }
    return result
  }

  /** Upsert a translation for a post */
  async upsertTranslation(slug: string, locale: string, data: { title?: string; excerpt?: string; content?: string[] }): Promise<any> {
    const post = await this.db.select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1)
    if (post.length === 0) return null

    const existing = await this.db.select().from(blogPostTranslations)
      .where(and(eq(blogPostTranslations.postId, post[0].id), eq(blogPostTranslations.locale, locale)))
      .limit(1)

    if (existing.length > 0) {
      const updates: Record<string, any> = { translatedAt: new Date().toISOString() }
      if (data.title !== undefined) updates.title = data.title
      if (data.excerpt !== undefined) updates.excerpt = data.excerpt
      if (data.content !== undefined) updates.content = JSON.stringify(data.content)
      await this.db.update(blogPostTranslations).set(updates)
        .where(and(eq(blogPostTranslations.postId, post[0].id), eq(blogPostTranslations.locale, locale)))
    } else {
      await this.db.insert(blogPostTranslations).values({
        id: crypto.randomUUID().replace(/-/g, ''),
        postId: post[0].id,
        locale,
        title: data.title ?? null,
        excerpt: data.excerpt ?? null,
        content: data.content ? JSON.stringify(data.content) : null,
        isAutoTranslated: 0,
        translatedAt: new Date().toISOString(),
      })
    }
    return (await this.getTranslations(slug))?.[locale] ?? null
  }

  /** Delete a translation */
  async deleteTranslation(slug: string, locale: string): Promise<boolean> {
    const post = await this.db.select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1)
    if (post.length === 0) return false
    await this.db.delete(blogPostTranslations)
      .where(and(eq(blogPostTranslations.postId, post[0].id), eq(blogPostTranslations.locale, locale)))
    return true
  }

  /** Get list of missing translations for published posts */
  async getMissingTranslations(): Promise<{ slug: string; title: string; locale: string }[]> {
    const SEO_LOCALES = new Set(['bs-BA', 'hr-HR', 'sr-Latn', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'tr-TR', 'ar-SA', 'pt-BR', 'nl-NL', 'ru-RU', 'ja-JP', 'zh-Hans', 'ko-KR'])

    const publishedPosts = await this.db
      .select({ id: blogPosts.id, slug: blogPosts.slug, title: blogPosts.title })
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, 1))

    const translations = await this.db
      .select({ postId: blogPostTranslations.postId, locale: blogPostTranslations.locale })
      .from(blogPostTranslations)

    // Extra locales are only tracked if used in ≥2 posts (intentional, not a one-off)
    const localeCounts = new Map<string, number>()
    for (const t of translations) localeCounts.set(t.locale, (localeCounts.get(t.locale) ?? 0) + 1)
    const extraLocales = [...localeCounts.entries()].filter(([, n]) => n >= 2).map(([l]) => l)
    const targetLocales = new Set([...SEO_LOCALES, ...extraLocales])
    const translated = new Set(translations.map(t => `${t.postId}:${t.locale}`))

    const missing: { slug: string; title: string; locale: string }[] = []
    for (const post of publishedPosts) {
      for (const locale of targetLocales) {
        if (!translated.has(`${post.id}:${locale}`)) {
          missing.push({ slug: post.slug, title: post.title, locale })
        }
      }
    }
    return missing
  }

  private async syncTags(postId: string, tagValues: string[]) {
    // Remove existing
    await this.db.delete(blogPostTags).where(eq(blogPostTags.postId, postId))
    // Re-add
    if (tagValues.length === 0) return
    const tagRows = await this.db.select({ id: tags.id, slug: tags.slug, label: tags.label }).from(tags)
    const tagToId = new Map<string, string>()
    for (const tag of tagRows) {
      tagToId.set(tag.slug, tag.id)
      tagToId.set(tag.label, tag.id)
    }
    for (const value of tagValues) {
      const tagId = tagToId.get(value)
      if (tagId) {
        await this.db.insert(blogPostTags).values({ postId, tagId })
      }
    }
  }

  private slugify(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  private async getTagSlugs(postId: string): Promise<string[]> {
    const rows = await this.db
      .select({ slug: tags.slug })
      .from(blogPostTags)
      .innerJoin(tags, eq(tags.id, blogPostTags.tagId))
      .where(eq(blogPostTags.postId, postId))
      .orderBy(tags.label)
    return rows.map(r => r.slug)
  }

  private buildPublishedWhere(filters: BlogPostFilters = {}) {
    const conditions = [eq(blogPosts.isPublished, 1)]

    if (filters.category) {
      conditions.push(this.categoryValueMatches(blogPosts.category, filters.category))
    }

    if (filters.subcategory) {
      conditions.push(this.categoryValueMatches(blogPosts.subcategory, filters.subcategory))
    }

    if (filters.tag) {
      conditions.push(sql`EXISTS (
        SELECT 1
        FROM ${blogPostTags}
        INNER JOIN ${tags} ON ${tags.id} = ${blogPostTags.tagId}
        WHERE ${blogPostTags.postId} = ${blogPosts.id}
          AND (${tags.slug} = ${filters.tag} OR ${tags.label} = ${filters.tag})
      )`)
    }

    const query = filters.q?.trim()
    if (query) {
      const pattern = `%${query}%`
      conditions.push(sql`(
        ${blogPosts.title} LIKE ${pattern}
        OR ${blogPosts.excerpt} LIKE ${pattern}
        OR ${blogPosts.content} LIKE ${pattern}
      )`)
    }

    return and(...conditions)
  }

  private categoryValueMatches(
    column: typeof blogPosts.category | typeof blogPosts.subcategory,
    value: string,
  ) {
    return sql`(
      ${column} = ${value}
      OR ${column} IN (
        SELECT ${categories.label}
        FROM ${categories}
        WHERE ${categories.slug} = ${value}
      )
    )`
  }

  private async toDto(
    post: typeof blogPosts.$inferSelect,
    translation?: typeof blogPostTranslations.$inferSelect | null,
    avatarUrl?: string | null,
    authorSlug?: string | null,
  ): Promise<BlogPostDto> {
    const tagSlugs = await this.getTagSlugs(post.id)
    // A translation whose locale matches the post's own language is redundant — ignore it
    // so the base post content always wins for its native language.
    const t = translation?.locale === post.lang ? null : translation
    return {
      id: post.id,
      slug: post.slug,
      lang: post.lang,
      title: t?.title ?? post.title,
      excerpt: t?.excerpt ?? post.excerpt,
      content: parseJson<string[]>(t?.content ?? post.content, []),
      isPublished: post.isPublished === 1,
      isFeatured: post.isFeatured === 1,
      publishedAt: post.publishedAt,
      readTime: post.readTime,
      category: post.category,
      subcategory: post.subcategory,
      coverImage: post.coverImage,
      bannerImage: post.bannerImage,
      authorId: post.authorId,
      author: post.authorName,
      authorName: post.authorName,
      authorAvatarUrl: avatarUrl ?? null,
      authorSlug: authorSlug ?? null,
      tags: tagSlugs,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    }
  }
}
