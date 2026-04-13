import { eq, desc, sql, and, like } from 'drizzle-orm'
import { parseJson, type Database } from '../client'
import { blogPosts, blogPostTranslations, blogPostTags, tags, users } from '../schema'
import type { BlogPostDto } from '../types/dtos'

export interface CreateBlogPostInput {
  slug?: string
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

  async getPublished(locale?: string, page = 1, pageSize = 10): Promise<BlogPostDto[]> {
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
      .where(eq(blogPosts.isPublished, 1))
      .orderBy(desc(blogPosts.publishedAt))
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
    return this.toDto(
      rows[0].blog_posts,
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

  async getCount(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(blogPosts)
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

    return (await this.getBySlug(slug))!
  }

  async update(slug: string, input: UpdateBlogPostInput): Promise<BlogPostDto | null> {
    const existing = await this.db.select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1)
    if (existing.length === 0) return null
    const postId = existing[0].id

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() }
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

    if (input.tags !== undefined) {
      await this.syncTags(postId, input.tags)
    }

    const finalSlug = input.slug ?? slug
    return this.getBySlug(finalSlug)
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

  private async syncTags(postId: string, tagSlugs: string[]) {
    // Remove existing
    await this.db.delete(blogPostTags).where(eq(blogPostTags.postId, postId))
    // Re-add
    if (tagSlugs.length === 0) return
    const tagRows = await this.db.select({ id: tags.id, slug: tags.slug }).from(tags)
    const slugToId = new Map(tagRows.map(t => [t.slug, t.id]))
    for (const slug of tagSlugs) {
      const tagId = slugToId.get(slug)
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
    return rows.map(r => r.slug)
  }

  private async toDto(
    post: typeof blogPosts.$inferSelect,
    translation?: typeof blogPostTranslations.$inferSelect | null,
    avatarUrl?: string | null,
    authorSlug?: string | null,
  ): Promise<BlogPostDto> {
    const tagSlugs = await this.getTagSlugs(post.id)
    return {
      id: post.id,
      slug: post.slug,
      title: translation?.title ?? post.title,
      excerpt: translation?.excerpt ?? post.excerpt,
      content: parseJson<string[]>(translation?.content ?? post.content, []),
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
