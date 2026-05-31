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
      return json(post, 201)
    }

    // Translations sub-routes (must be checked before exact slug match)
    const transMatch = path.match(/^\/api\/manage\/blog\/([^/]+)\/translations(?:\/([^/]+))?$/)
    if (transMatch) {
      return handleBlogTranslations(db, method, transMatch[1], transMatch[2], request, auth, ctx, apiOrigin)
    }

    // Translate trigger — proxy to Azure; sourceLocale + content are supplied by the frontend
    const translateMatch = path.match(/^\/api\/manage\/blog\/([^/]+)\/translate$/)
    if (translateMatch && method === 'POST') {
      const targetUrl = `${apiOrigin}${path}`
      const headers = new Headers(request.headers)
      headers.set('Host', new URL(apiOrigin).host)
      headers.delete('content-length')
      return fetch(new Request(targetUrl, { method: 'POST', headers, body: request.body }))
    }

    const blogSlug = path.match(/^\/api\/manage\/blog\/([^/]+)$/)
    if (blogSlug) {
      const slug = blogSlug[1]

      if (method === 'PUT') {
        const perm = requirePermission(auth.payload, 'manage:blog')
        if (perm) return perm
        const body = await readBody(request)
        const repo = new BlogPostRepository(db)
        const updated = await repo.update(slug, body)
        if (!updated) return err('Not found', 404)
        return json(updated)
      }

      if (method === 'DELETE') {
        const perm = requirePermission(auth.payload, 'manage:blog')
        if (perm) return perm
        const repo = new BlogPostRepository(db)
        const deleted = await repo.delete(slug)
        if (!deleted) return err('Not found', 404)
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
      return json({ message: `Seeded ${inserted} posts`, inserted })
    }

    // Blog: missing translations
    if (path === '/api/manage/blog/missing-translations' && method === 'GET') {
      const perm = requirePermission(auth.payload, 'manage:blog')
      if (perm) return perm
      const repo = new BlogPostRepository(db)
      return json(await repo.getMissingTranslations())
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
        return json(cat, 201)
      }
    }

    // Category translate — enrich with D1 label, proxy to Azure, save results to D1
    const catTranslateMatch = path.match(/^\/api\/manage\/categories\/([^/]+)\/translate$/)
    if (catTranslateMatch && method === 'POST') {
      const perm = requirePermission(auth.payload, 'manage:categories')
      if (perm) return perm
      const id = catTranslateMatch[1]
      const repo = new CategoryRepository(db)
      const category = await repo.getById(id)
      if (!category) return err('Category not found', 404)
      const body = await readBody(request)
      const enrichedBody = {
        ...body,
        label: category.label,
        sourceLocale: category.lang ?? 'en-US',
      }
      const azureRes = await fetch(new Request(`${apiOrigin}${path}`, {
        method: 'POST',
        headers: new Headers({ ...Object.fromEntries(new Headers(request.headers)), 'Content-Type': 'application/json', 'Host': new URL(apiOrigin).host }),
        body: JSON.stringify(enrichedBody),
      }))
      if (!azureRes.ok) return new Response(await azureRes.text(), { status: azureRes.status })
      const azureData = await azureRes.json() as { translations?: Record<string, string> }
      if (azureData.translations && Object.keys(azureData.translations).length > 0) {
        await repo.update(id, { translations: azureData.translations })
      }
      return json(await repo.getById(id))
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
        return json(updated)
      }

      if (method === 'DELETE') {
        const perm = requirePermission(auth.payload, 'manage:categories')
        if (perm) return perm
        const deleted = await repo.delete(id)
        if (!deleted) return err('Not found', 404)
        return new Response(null, { status: 204 })
      }
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
        return json(tag, 201)
      }
    }

    // Tag translate — enrich with D1 label, proxy to Azure, save results to D1
    const tagTranslateMatch = path.match(/^\/api\/manage\/tags\/([^/]+)\/translate$/)
    if (tagTranslateMatch && method === 'POST') {
      const perm = requirePermission(auth.payload, 'manage:tags')
      if (perm) return perm
      const id = tagTranslateMatch[1]
      const repo = new TagRepository(db)
      const tag = await repo.getById(id)
      if (!tag) return err('Tag not found', 404)
      const body = await readBody(request)
      const enrichedBody = {
        ...body,
        label: tag.label,
        sourceLocale: tag.lang ?? 'en-US',
      }
      const azureRes = await fetch(new Request(`${apiOrigin}${path}`, {
        method: 'POST',
        headers: new Headers({ ...Object.fromEntries(new Headers(request.headers)), 'Content-Type': 'application/json', 'Host': new URL(apiOrigin).host }),
        body: JSON.stringify(enrichedBody),
      }))
      if (!azureRes.ok) return new Response(await azureRes.text(), { status: azureRes.status })
      const azureData = await azureRes.json() as { translations?: Record<string, string> }
      if (azureData.translations && Object.keys(azureData.translations).length > 0) {
        await repo.update(id, { translations: azureData.translations })
      }
      return json(await repo.getById(id))
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
        return json(updated)
      }

      if (method === 'DELETE') {
        const perm = requirePermission(auth.payload, 'manage:tags')
        if (perm) return perm
        const deleted = await repo.delete(id)
        if (!deleted) return err('Not found', 404)
        return new Response(null, { status: 204 })
      }
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
        return json(updated)
      }

      if (method === 'DELETE') {
        const perm = requirePermission(auth.payload, 'manage:case-studies')
        if (perm) return perm
        const deleted = await repo.delete(slug)
        if (!deleted) return err('Not found', 404)
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
        return json(updated)
      }

      if (method === 'DELETE') {
        const perm = requirePermission(auth.payload, 'manage:roles')
        if (perm) return perm
        const deleted = await repo.delete(id)
        if (!deleted) return err('Cannot delete', 400)
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
        return json(updated)
      }

      if (method === 'DELETE') {
        const perm = requirePermission(auth.payload, 'manage:llm')
        if (perm) return perm
        const deleted = await repo.delete(key)
        if (!deleted) return err('Not found', 404)
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
    return json(result)
  }

  if (method === 'DELETE' && locale) {
    const ok = await repo.deleteTranslation(slug, locale)
    if (!ok) return err('Not found', 404)
    return new Response(null, { status: 204 })
  }

  return null
}
