/**
 * SSR data fetchers — used by route loaders to read D1 directly.
 *
 * Each fetcher is a createIsomorphicFn: the TanStack Start compiler keeps only
 * the `.server()` body in the SSR bundle and only the `.client()` body in the
 * browser bundle, so the D1 repositories, drizzle-orm and the schema never ship
 * to the client. On the client every fetcher resolves to null, which loaders
 * already treat as "fetch through React Query / the HTTP API instead".
 */
import { createIsomorphicFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { getD1 } from './d1-context'
import { blogPostTranslations, blogPosts } from './db/schema'
import { BlogPostRepository } from './db/repositories/blog-post'
import { CategoryRepository } from './db/repositories/category'
import { TagRepository } from './db/repositories/tag'
import { CaseStudyRepository } from './db/repositories/case-study'
import { UserRepository } from './db/repositories/user'

/** Fetch paginated blog posts — direct D1 on server, null on client */
export const ssrBlogPosts = createIsomorphicFn()
  .server(async (locale?: string, page = 1, pageSize = 9) => {
    const db = getD1()
    if (!db) return null

    const repo = new BlogPostRepository(db)
    const [items, total] = await Promise.all([
      repo.getPublished(locale, page, pageSize),
      repo.getCount({}, locale),
    ])
    return {
      items,
      totalCount: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  })
  .client(() => Promise.resolve(null))

/** Fetch a single blog post by slug — direct D1 */
export const ssrBlogPost = createIsomorphicFn()
  .server(async (slug: string, locale?: string) => {
    const db = getD1()
    if (!db) return null
    return new BlogPostRepository(db).getBySlug(slug, locale)
  })
  .client(() => Promise.resolve(null))

/**
 * Whether a blog slug exists at all (any language) — direct D1.
 * null means "can't tell" (no D1, e.g. client-side navigation).
 */
export const ssrBlogPostExists = createIsomorphicFn()
  .server(async (slug: string): Promise<boolean | null> => {
    const db = getD1()
    if (!db) return null
    return new BlogPostRepository(db).slugExists(slug)
  })
  .client((): Promise<boolean | null> => Promise.resolve(null))

/**
 * Locales a blog post can be read in: its own language plus every locale with
 * a translation row (the same rule getBySlug uses to return the post).
 * [] means the slug does not exist; null means "can't tell" (no D1, e.g.
 * client-side navigation).
 */
export const ssrBlogPostLocales = createIsomorphicFn()
  .server(async (slug: string): Promise<Array<string> | null> => {
    const db = getD1()
    if (!db) return null
    const posts = await db
      .select({ id: blogPosts.id, lang: blogPosts.lang })
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1)
    if (posts.length === 0) return []
    const translations = await db
      .select({ locale: blogPostTranslations.locale })
      .from(blogPostTranslations)
      .where(eq(blogPostTranslations.postId, posts[0].id))
    return [
      ...new Set([posts[0].lang, ...translations.map((row) => row.locale)]),
    ]
  })
  .client((): Promise<Array<string> | null> => Promise.resolve(null))

/**
 * Up to 3 published posts from the same category, for the "related posts"
 * block (same rule as useRelatedBlogPosts), limited to posts readable in this
 * locale. The bodies are dropped: the cards only need the summary fields, and
 * this is dehydrated into the page.
 */
export const ssrRelatedPosts = createIsomorphicFn()
  .server(
    async (
      locale: string | undefined,
      category: string | null | undefined,
      excludeSlug: string,
    ) => {
      const db = getD1()
      if (!db) return null
      if (!category) return []
      // getPublished lists only posts readable in this locale (native
      // language or a translation row); the others 404 here, and a related
      // link must not.
      const candidates = (
        await new BlogPostRepository(db).getPublished(locale, 1, 8, { category })
      ).filter((post) => post.slug !== excludeSlug)
      return candidates
        .slice(0, 3)
        .map((post) => ({ ...post, content: [] as Array<string> }))
    },
  )
  .client(() => Promise.resolve(null))

/** Fetch all categories — direct D1 */
export const ssrCategories = createIsomorphicFn()
  .server(async (locale?: string) => {
    const db = getD1()
    if (!db) return null
    return new CategoryRepository(db).getAll(locale)
  })
  .client(() => Promise.resolve(null))

/** Fetch all tags — direct D1 */
export const ssrTags = createIsomorphicFn()
  .server(async (locale?: string) => {
    const db = getD1()
    if (!db) return null
    return new TagRepository(db).getAll(locale)
  })
  .client(() => Promise.resolve(null))

/** Fetch published case studies — direct D1 */
export const ssrCaseStudies = createIsomorphicFn()
  .server(async (locale?: string) => {
    const db = getD1()
    if (!db) return null
    return new CaseStudyRepository(db).getPublished(locale)
  })
  .client(() => Promise.resolve(null))

/** Fetch authors — direct D1 */
export const ssrAuthors = createIsomorphicFn()
  .server(async () => {
    const db = getD1()
    if (!db) return null
    return new UserRepository(db).getAuthors()
  })
  .client(() => Promise.resolve(null))

/** Fetch author by slug — direct D1 */
export const ssrAuthorBySlug = createIsomorphicFn()
  .server(async (slug: string) => {
    const db = getD1()
    if (!db) return null
    return new UserRepository(db).getBySlug(slug)
  })
  .client(() => Promise.resolve(null))
