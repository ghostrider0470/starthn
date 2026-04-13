/**
 * SSR data fetchers — used by route loaders to read D1 directly.
 * Falls back to HTTP API when D1 isn't available (client-side).
 */
import { getD1 } from './d1-context'
import { BlogPostRepository } from './db/repositories/blog-post'
import { CategoryRepository } from './db/repositories/category'
import { TagRepository } from './db/repositories/tag'
import { CaseStudyRepository } from './db/repositories/case-study'
import { UserRepository } from './db/repositories/user'

/** Fetch paginated blog posts — direct D1 on server, HTTP fallback on client */
export async function ssrBlogPosts(locale?: string, page = 1, pageSize = 9) {
  const db = getD1()
  if (!db) return null

  const repo = new BlogPostRepository(db)
  const [items, total] = await Promise.all([
    repo.getPublished(locale, page, pageSize),
    repo.getCount(),
  ])
  return { items, totalCount: total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

/** Fetch a single blog post by slug — direct D1 */
export async function ssrBlogPost(slug: string, locale?: string) {
  const db = getD1()
  if (!db) return null
  return new BlogPostRepository(db).getBySlug(slug, locale)
}

/** Fetch all categories — direct D1 */
export async function ssrCategories(locale?: string) {
  const db = getD1()
  if (!db) return null
  return new CategoryRepository(db).getAll(locale)
}

/** Fetch all tags — direct D1 */
export async function ssrTags(locale?: string) {
  const db = getD1()
  if (!db) return null
  return new TagRepository(db).getAll(locale)
}

/** Fetch published case studies — direct D1 */
export async function ssrCaseStudies(locale?: string) {
  const db = getD1()
  if (!db) return null
  return new CaseStudyRepository(db).getPublished(locale)
}

/** Fetch authors — direct D1 */
export async function ssrAuthors() {
  const db = getD1()
  if (!db) return null
  return new UserRepository(db).getAuthors()
}

/** Fetch author by slug — direct D1 */
export async function ssrAuthorBySlug(slug: string) {
  const db = getD1()
  if (!db) return null
  return new UserRepository(db).getBySlug(slug)
}
