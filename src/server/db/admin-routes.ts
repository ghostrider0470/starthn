/**
 * Admin API route handlers — served from D1 at the edge.
 * All /manage/* routes require JWT auth.
 * After each write, syncs to Azure in the background.
 */
import { createDb } from './client'
import { BlogPostRepository } from './repositories/blog-post'
import { CategoryRepository } from './repositories/category'
import { TagRepository } from './repositories/tag'
import { CaseStudyRepository } from './repositories/case-study'
import { UserRepository } from './repositories/user'
import { RoleRepository } from './repositories/role'
import { LlmProviderRepository } from './repositories/llm-provider'
import { LlmSettingsRepository } from './repositories/llm-settings'
import { requireAuth, requirePermission, type AuthResult } from '../auth'
import { syncToAzure } from '../sync'

interface Env {
  DB: D1Database
  JWT_SECRET: string
  API_ORIGIN: string
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function err(message: string, status = 400) {
  return json({ error: message }, status)
}

async function readBody<T = any>(request: Request): Promise<T> {
  return request.json() as Promise<T>
}

/**
 * Handle admin /manage/* routes via D1.
 * Returns Response if handled, null if should fall through to Azure.
 */
export async function handleAdminRoute(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response | null> {
  if (!env?.DB || !env?.JWT_SECRET) return null

  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  // Only handle /manage/* and a few other admin routes
  if (!path.startsWith('/api/manage/') && !path.startsWith('/api/roles') && !path.startsWith('/api/permissions')) {
    return null
  }

  // Authenticate
  const authResult = await requireAuth(request, env.JWT_SECRET, env.DB)
  if (authResult instanceof Response) return authResult
  const auth = authResult as AuthResult
  const apiOrigin = env.API_ORIGIN || 'https://starthn-func-prod.azurewebsites.net'

  const db = createDb(env.DB)

  try {
    // ─── Stats ─────────────────────────────────────────────
    if (path === '/api/manage/stats' && method === 'GET') {
      const repo = new UserRepository(db)
      return json(await repo.getStats())
    }

    // ─── Blog Posts ────────────────────────────────────────
    if (path === '/api/manage/blog' && method === 'GET') {
      const perm = requirePermission(auth.payload, 'manage:blog')
      if (perm) return perm
      const repo = new BlogPostRepository(db)
      return json(await repo.getAllAdmin())
    }

    if (path === '/api/manage/blog' && method === 'POST') {
      const perm = requirePermission(auth.payload, 'manage:blog')
      if (perm) return perm
      const body = await readBody(request)
      const repo = new BlogPostRepository(db)
      const post = await repo.create(body, auth.payload.sub, auth.payload.given_name)
      syncToAzure(ctx, apiOrigin, 'POST', '/api/manage/blog', body, auth.token)
      return json(post, 201)
    }

    const blogSlug = path.match(/^\/api\/manage\/blog\/([^/]+)$/)
    if (blogSlug) {
      const slug = blogSlug[1]

      // Translations sub-routes
      const transMatch = path.match(/^\/api\/manage\/blog\/([^/]+)\/translations(?:\/([^/]+))?$/)
      if (transMatch) {
        return handleBlogTranslations(db, method, transMatch[1], transMatch[2], request, auth, ctx, apiOrigin)
      }

      // Translate trigger
      if (path.match(/^\/api\/manage\/blog\/[^/]+\/translate$/) && method === 'POST') {
        // Translation requires AI — proxy to Azure
        return null
      }

      if (method === 'PUT') {
        const perm = requirePermission(auth.payload, 'manage:blog')
        if (perm) return perm
        const body = await readBody(request)
        const repo = new BlogPostRepository(db)
        const updated = await repo.update(slug, body)
        if (!updated) return err('Not found', 404)
        syncToAzure(ctx, apiOrigin, 'PUT', `/api/manage/blog/${slug}`, body, auth.token)
        return json(updated)
      }

      if (method === 'DELETE') {
        const perm = requirePermission(auth.payload, 'manage:blog')
        if (perm) return perm
        const repo = new BlogPostRepository(db)
        const deleted = await repo.delete(slug)
        if (!deleted) return err('Not found', 404)
        syncToAzure(ctx, apiOrigin, 'DELETE', `/api/manage/blog/${slug}`, undefined, auth.token)
        return new Response(null, { status: 204 })
      }
    }

    // Blog seed
    if (path === '/api/manage/blog/seed' && method === 'POST') {
      const perm = requirePermission(auth.payload, 'manage:blog')
      if (perm) return perm
      const items = await readBody<any[]>(request)
      const repo = new BlogPostRepository(db)
      let inserted = 0
      for (const item of items) {
        await repo.create(item, auth.payload.sub, auth.payload.given_name)
        inserted++
      }
      syncToAzure(ctx, apiOrigin, 'POST', '/api/manage/blog/seed', items, auth.token)
      return json({ message: `Seeded ${inserted} posts`, inserted })
    }

    // Blog image upload — needs R2 or Azure blob, proxy to Azure
    if (path === '/api/manage/blog/upload-image' && method === 'POST') {
      return null
    }

    // ─── Categories ────────────────────────────────────────
    if (path === '/api/manage/categories') {
      const repo = new CategoryRepository(db)

      if (method === 'GET') {
        return json(await repo.getAll())
      }

      if (method === 'POST') {
        const perm = requirePermission(auth.payload, 'manage:categories')
        if (perm) return perm
        const body = await readBody(request)
        const cat = await repo.create(body)
        syncToAzure(ctx, apiOrigin, 'POST', '/api/manage/categories', body, auth.token)
        return json(cat, 201)
      }
    }

    const catIdMatch = path.match(/^\/api\/manage\/categories\/([^/]+)$/)
    if (catIdMatch) {
      const id = catIdMatch[1]
      const repo = new CategoryRepository(db)

      if (method === 'PUT') {
        const perm = requirePermission(auth.payload, 'manage:categories')
        if (perm) return perm
        const body = await readBody(request)
        const updated = await repo.update(id, body)
        if (!updated) return err('Not found', 404)
        syncToAzure(ctx, apiOrigin, 'PUT', `/api/manage/categories/${id}`, body, auth.token)
        return json(updated)
      }

      if (method === 'DELETE') {
        const perm = requirePermission(auth.payload, 'manage:categories')
        if (perm) return perm
        const deleted = await repo.delete(id)
        if (!deleted) return err('Not found', 404)
        syncToAzure(ctx, apiOrigin, 'DELETE', `/api/manage/categories/${id}`, undefined, auth.token)
        return new Response(null, { status: 204 })
      }

      // Translate trigger — proxy to Azure (needs AI)
      if (path.endsWith('/translate') && method === 'POST') return null
    }

    // ─── Tags ──────────────────────────────────────────────
    if (path === '/api/manage/tags') {
      const repo = new TagRepository(db)

      if (method === 'GET') {
        return json(await repo.getAll())
      }

      if (method === 'POST') {
        const perm = requirePermission(auth.payload, 'manage:tags')
        if (perm) return perm
        const body = await readBody(request)
        const tag = await repo.create(body)
        syncToAzure(ctx, apiOrigin, 'POST', '/api/manage/tags', body, auth.token)
        return json(tag, 201)
      }
    }

    const tagIdMatch = path.match(/^\/api\/manage\/tags\/([^/]+)$/)
    if (tagIdMatch) {
      const id = tagIdMatch[1]
      const repo = new TagRepository(db)

      if (method === 'PUT') {
        const perm = requirePermission(auth.payload, 'manage:tags')
        if (perm) return perm
        const body = await readBody(request)
        const updated = await repo.update(id, body)
        if (!updated) return err('Not found', 404)
        syncToAzure(ctx, apiOrigin, 'PUT', `/api/manage/tags/${id}`, body, auth.token)
        return json(updated)
      }

      if (method === 'DELETE') {
        const perm = requirePermission(auth.payload, 'manage:tags')
        if (perm) return perm
        const deleted = await repo.delete(id)
        if (!deleted) return err('Not found', 404)
        syncToAzure(ctx, apiOrigin, 'DELETE', `/api/manage/tags/${id}`, undefined, auth.token)
        return new Response(null, { status: 204 })
      }

      if (path.endsWith('/translate') && method === 'POST') return null
    }

    // ─── Case Studies ──────────────────────────────────────
    if (path === '/api/manage/case-studies') {
      const repo = new CaseStudyRepository(db)

      if (method === 'GET') {
        const perm = requirePermission(auth.payload, 'manage:case-studies')
        if (perm) return perm
        return json(await repo.getAll())
      }

      if (method === 'POST') {
        const perm = requirePermission(auth.payload, 'manage:case-studies')
        if (perm) return perm
        const body = await readBody(request)
        const cs = await repo.create(body)
        syncToAzure(ctx, apiOrigin, 'POST', '/api/manage/case-studies', body, auth.token)
        return json(cs, 201)
      }
    }

    const csSlugMatch = path.match(/^\/api\/manage\/case-studies\/([^/]+)$/)
    if (csSlugMatch) {
      const slug = csSlugMatch[1]
      const repo = new CaseStudyRepository(db)

      if (method === 'PUT') {
        const perm = requirePermission(auth.payload, 'manage:case-studies')
        if (perm) return perm
        const body = await readBody(request)
        const updated = await repo.update(slug, body)
        if (!updated) return err('Not found', 404)
        syncToAzure(ctx, apiOrigin, 'PUT', `/api/manage/case-studies/${slug}`, body, auth.token)
        return json(updated)
      }

      if (method === 'DELETE') {
        const perm = requirePermission(auth.payload, 'manage:case-studies')
        if (perm) return perm
        const deleted = await repo.delete(slug)
        if (!deleted) return err('Not found', 404)
        syncToAzure(ctx, apiOrigin, 'DELETE', `/api/manage/case-studies/${slug}`, undefined, auth.token)
        return new Response(null, { status: 204 })
      }
    }

    // Case study seed
    if (path === '/api/manage/case-studies/seed' && method === 'POST') {
      const perm = requirePermission(auth.payload, 'manage:case-studies')
      if (perm) return perm
      const items = await readBody<any[]>(request)
      const repo = new CaseStudyRepository(db)
      let inserted = 0
      for (const item of items) {
        await repo.create(item)
        inserted++
      }
      syncToAzure(ctx, apiOrigin, 'POST', '/api/manage/case-studies/seed', items, auth.token)
      return json({ message: `Seeded ${inserted} case studies`, inserted })
    }

    // ─── Users (Admin) ─────────────────────────────────────
    if (path === '/api/manage/users' && method === 'GET') {
      const perm = requirePermission(auth.payload, 'manage:users')
      if (perm) return perm
      const repo = new UserRepository(db)
      const search = url.searchParams.get('search') ?? undefined
      const role = url.searchParams.get('role') ?? undefined
      const page = parseInt(url.searchParams.get('page') || '1')
      const pageSize = parseInt(url.searchParams.get('pageSize') || '20')
      return json(await repo.getAdminList({ search, role, page, pageSize }))
    }

    const userIdMatch = path.match(/^\/api\/manage\/users\/([^/]+)$/)
    if (userIdMatch && method === 'GET') {
      const perm = requirePermission(auth.payload, 'manage:users')
      if (perm) return perm
      const repo = new UserRepository(db)
      const user = await repo.getById(userIdMatch[1])
      if (!user) return err('Not found', 404)
      return json(user)
    }

    const userRolesMatch = path.match(/^\/api\/manage\/users\/([^/]+)\/roles$/)
    if (userRolesMatch && method === 'PUT') {
      const perm = requirePermission(auth.payload, 'manage:users')
      if (perm) return perm
      const body = await readBody<{ roles: string[] }>(request)
      const repo = new UserRepository(db)
      const ok = await repo.updateRoles(userRolesMatch[1], body.roles)
      if (!ok) return err('Not found', 404)
      syncToAzure(ctx, apiOrigin, 'PUT', `/api/manage/users/${userRolesMatch[1]}/roles`, body, auth.token)
      return json({ success: true })
    }

    const userStatusMatch = path.match(/^\/api\/manage\/users\/([^/]+)\/status$/)
    if (userStatusMatch && method === 'PUT') {
      const perm = requirePermission(auth.payload, 'manage:users')
      if (perm) return perm
      const body = await readBody<{ isActive: boolean }>(request)
      const repo = new UserRepository(db)
      const ok = await repo.updateStatus(userStatusMatch[1], body.isActive)
      if (!ok) return err('Not found', 404)
      syncToAzure(ctx, apiOrigin, 'PUT', `/api/manage/users/${userStatusMatch[1]}/status`, body, auth.token)
      return json({ success: true })
    }

    // ─── Authors ───────────────────────────────────────────
    if (path === '/api/manage/authors' && method === 'GET') {
      const repo = new UserRepository(db)
      return json(await repo.getAuthors())
    }

    const authorUpdateMatch = path.match(/^\/api\/manage\/authors\/([^/]+)$/)
    if (authorUpdateMatch && method === 'PUT') {
      const body = await readBody(request)
      const repo = new UserRepository(db)
      const updated = await repo.updateAuthorProfile(authorUpdateMatch[1], body)
      if (!updated) return err('Not found', 404)
      syncToAzure(ctx, apiOrigin, 'PUT', `/api/manage/authors/${authorUpdateMatch[1]}`, body, auth.token)
      return json(updated)
    }

    // ─── Roles ─────────────────────────────────────────────
    if (path === '/api/roles' && method === 'GET') {
      const repo = new RoleRepository(db)
      return json(await repo.getPublic())
    }

    if (path === '/api/manage/roles') {
      const repo = new RoleRepository(db)

      if (method === 'GET') {
        return json(await repo.getAll())
      }

      if (method === 'POST') {
        const perm = requirePermission(auth.payload, 'manage:roles')
        if (perm) return perm
        const body = await readBody(request)
        const role = await repo.create(body)
        syncToAzure(ctx, apiOrigin, 'POST', '/api/manage/roles', body, auth.token)
        return json(role, 201)
      }
    }

    const roleIdMatch = path.match(/^\/api\/manage\/roles\/([^/]+)$/)
    if (roleIdMatch) {
      const id = roleIdMatch[1]
      const repo = new RoleRepository(db)

      if (method === 'PUT') {
        const perm = requirePermission(auth.payload, 'manage:roles')
        if (perm) return perm
        const body = await readBody(request)
        const updated = await repo.update(id, body)
        if (!updated) return err('Not found', 404)
        syncToAzure(ctx, apiOrigin, 'PUT', `/api/manage/roles/${id}`, body, auth.token)
        return json(updated)
      }

      if (method === 'DELETE') {
        const perm = requirePermission(auth.payload, 'manage:roles')
        if (perm) return perm
        const deleted = await repo.delete(id)
        if (!deleted) return err('Cannot delete', 400)
        syncToAzure(ctx, apiOrigin, 'DELETE', `/api/manage/roles/${id}`, undefined, auth.token)
        return new Response(null, { status: 204 })
      }
    }

    // ─── LLM Providers ─────────────────────────────────────
    if (path === '/api/manage/llm/providers') {
      const repo = new LlmProviderRepository(db)

      if (method === 'GET') {
        return json(await repo.getAll())
      }

      if (method === 'POST') {
        const perm = requirePermission(auth.payload, 'manage:llm')
        if (perm) return perm
        const body = await readBody(request)
        const provider = await repo.create(body)
        syncToAzure(ctx, apiOrigin, 'POST', '/api/manage/llm/providers', body, auth.token)
        return json(provider, 201)
      }
    }

    const llmKeyMatch = path.match(/^\/api\/manage\/llm\/providers\/([^/]+)$/)
    if (llmKeyMatch) {
      const key = llmKeyMatch[1]
      const repo = new LlmProviderRepository(db)

      if (method === 'PUT') {
        const perm = requirePermission(auth.payload, 'manage:llm')
        if (perm) return perm
        const body = await readBody(request)
        const updated = await repo.update(key, body)
        if (!updated) return err('Not found', 404)
        syncToAzure(ctx, apiOrigin, 'PUT', `/api/manage/llm/providers/${key}`, body, auth.token)
        return json(updated)
      }

      if (method === 'DELETE') {
        const perm = requirePermission(auth.payload, 'manage:llm')
        if (perm) return perm
        const deleted = await repo.delete(key)
        if (!deleted) return err('Not found', 404)
        syncToAzure(ctx, apiOrigin, 'DELETE', `/api/manage/llm/providers/${key}`, undefined, auth.token)
        return new Response(null, { status: 204 })
      }
    }

    // ─── LLM Settings ──────────────────────────────────────
    if (path === '/api/manage/llm/settings') {
      const repo = new LlmSettingsRepository(db)

      if (method === 'GET') {
        return json(await repo.get())
      }

      if (method === 'PUT') {
        const perm = requirePermission(auth.payload, 'manage:llm')
        if (perm) return perm
        const body = await readBody(request)
        await repo.upsert(body)
        syncToAzure(ctx, apiOrigin, 'PUT', '/api/manage/llm/settings', body, auth.token)
        return json(await repo.get())
      }
    }

    // ─── Permissions list ──────────────────────────────────
    if (path === '/api/permissions' && method === 'GET') {
      // Static permission groups — no DB needed
      return json({
        blog: ['manage:blog'],
        categories: ['manage:categories'],
        tags: ['manage:tags'],
        'case-studies': ['manage:case-studies'],
        users: ['manage:users'],
        roles: ['manage:roles'],
        llm: ['manage:llm'],
        chat: ['manage:chat'],
        contact: ['manage:contact'],
      })
    }

  } catch (error) {
    console.error('[admin-routes] Error:', error)
    // Fall through to Azure on D1 errors
    return null
  }

  // Not handled here — fall through to Azure
  return null
}

// ─── Blog Translation helpers ────────────────────────────

async function handleBlogTranslations(
  db: ReturnType<typeof createDb>,
  method: string,
  slug: string,
  locale: string | undefined,
  request: Request,
  auth: AuthResult,
  ctx: ExecutionContext,
  apiOrigin: string,
): Promise<Response | null> {
  const perm = requirePermission(auth.payload, 'manage:blog')
  if (perm) return perm
  const repo = new BlogPostRepository(db)

  if (method === 'GET' && !locale) {
    const translations = await repo.getTranslations(slug)
    if (translations === null) return err('Not found', 404)
    return json(translations)
  }

  if (method === 'PUT' && locale) {
    const body = await readBody(request)
    const result = await repo.upsertTranslation(slug, locale, body)
    if (!result) return err('Not found', 404)
    syncToAzure(ctx, apiOrigin, 'PUT', `/api/manage/blog/${slug}/translations/${locale}`, body, auth.token)
    return json(result)
  }

  if (method === 'DELETE' && locale) {
    const ok = await repo.deleteTranslation(slug, locale)
    if (!ok) return err('Not found', 404)
    syncToAzure(ctx, apiOrigin, 'DELETE', `/api/manage/blog/${slug}/translations/${locale}`, undefined, auth.token)
    return new Response(null, { status: 204 })
  }

  return null
}
