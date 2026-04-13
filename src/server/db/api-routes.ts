/**
 * D1-backed API route handlers for public read endpoints.
 * These replace the Azure proxy for read-heavy routes.
 */
import { createDb } from './client'
import { BlogPostRepository } from './repositories/blog-post'
import { CategoryRepository } from './repositories/category'
import { TagRepository } from './repositories/tag'
import { CaseStudyRepository } from './repositories/case-study'
import { UserRepository } from './repositories/user'

interface Env {
  DB: D1Database
}

function json(data: unknown, status = 200, cacheSeconds?: number) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (cacheSeconds) {
    headers['Cache-Control'] = `public, max-age=${Math.floor(cacheSeconds / 6)}, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`
  }
  return new Response(JSON.stringify(data), { status, headers })
}

/**
 * Try to handle a public read API route via D1.
 * Returns a Response if handled, or null if the route should fall through to Azure.
 */
export async function handleD1Route(request: Request, env: Env): Promise<Response | null> {
  if (request.method !== 'GET') return null
  if (!env?.DB) return null

  const url = new URL(request.url)
  const path = url.pathname
  const locale = url.searchParams.get('lang') || url.searchParams.get('locale') || undefined

  const db = createDb(env.DB)

  try {
    // GET /api/blog — if page param: paginated response; otherwise: plain array
    if (path === '/api/blog') {
      const repo = new BlogPostRepository(db)

      if (url.searchParams.has('page') || url.searchParams.has('pageSize')) {
        const page = parseInt(url.searchParams.get('page') || '1')
        const pageSize = parseInt(url.searchParams.get('pageSize') || '10')
        const [items, total] = await Promise.all([
          repo.getPublished(locale, page, pageSize),
          repo.getCount(),
        ])
        return json({
          items,
          totalCount: total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        }, 200, 300)
      }

      // No pagination — return plain array (used by useBlogPosts hook)
      return json(await repo.getPublished(locale, 1, 100), 200, 300)
    }

    // GET /api/blog/{slug}
    const blogSlugMatch = path.match(/^\/api\/blog\/([^/]+)$/)
    if (blogSlugMatch) {
      const slug = blogSlugMatch[1]
      // Skip "categories" and "tags" sub-routes
      if (slug === 'categories' || slug === 'tags') {
        // Fall through to category/tag handlers below
      } else {
        const repo = new BlogPostRepository(db)
        const post = await repo.getBySlug(slug, locale)
        if (!post) return json({ error: 'Not found' }, 404)
        return json(post, 200, 3600)
      }
    }

    // GET /api/blog/categories
    if (path === '/api/blog/categories') {
      const repo = new CategoryRepository(db)
      return json(await repo.getAll(locale), 200, 86400)
    }

    // GET /api/blog/tags
    if (path === '/api/blog/tags') {
      const repo = new TagRepository(db)
      return json(await repo.getAll(locale), 200, 86400)
    }

    // GET /api/case-studies
    if (path === '/api/case-studies') {
      const repo = new CaseStudyRepository(db)
      return json(await repo.getPublished(locale), 200, 300)
    }

    // GET /api/case-studies/{slug}
    const caseSlugMatch = path.match(/^\/api\/case-studies\/([^/]+)$/)
    if (caseSlugMatch) {
      const repo = new CaseStudyRepository(db)
      const study = await repo.getBySlug(caseSlugMatch[1], locale)
      if (!study) return json({ error: 'Not found' }, 404)
      return json(study, 200, 3600)
    }

    // GET /api/authors
    if (path === '/api/authors') {
      const repo = new UserRepository(db)
      return json(await repo.getAuthors(), 200, 86400)
    }

    // GET /api/authors/{slug}
    const authorSlugMatch = path.match(/^\/api\/authors\/([^/]+)$/)
    if (authorSlugMatch) {
      const repo = new UserRepository(db)
      const author = await repo.getBySlug(authorSlugMatch[1])
      if (!author) return json({ error: 'Not found' }, 404)
      return json(author, 200, 86400)
    }
  } catch (err) {
    console.error('D1 route error:', err)
    // Fall through to Azure on D1 errors
    return null
  }

  return null
}
