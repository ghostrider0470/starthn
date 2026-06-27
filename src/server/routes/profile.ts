import bcrypt from 'bcryptjs'
import { createDb } from '../db/client'
import { UserRepository } from '../db/repositories/user'
import { ApiKeyRepository } from '../db/repositories/api-key'
import { requireAuth } from '../auth'

interface ProfileEnv {
  DB: D1Database
  JWT_SECRET: string
  IMG_CACHE?: R2Bucket
  API_ORIGIN?: string
  // Shared secret forwarded to Azure for the page-translate compute call.
  SYNC_SECRET: string
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function handleProfileRoute(request: Request, env: ProfileEnv): Promise<Response | null> {
  if (!env?.DB || !env?.JWT_SECRET) return null

  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  // Not a /api/user/* path
  if (!path.startsWith('/api/user/')) return null

  // Require authentication
  const authResult = await requireAuth(request, env.JWT_SECRET, env.DB)
  if (authResult instanceof Response) return authResult
  const auth = authResult
  const userId = auth.payload.sub

  // Page translation is AI compute delegated to Azure, which is now stateless:
  // we read the source content from D1, send it to Azure for translation, then
  // persist the returned translations back to D1. Azure touches no datastore.
  if (path === '/api/user/page/translate' && method === 'POST') {
    const { languages } = (await request.json().catch(() => ({}))) as { languages?: string[] }
    if (!Array.isArray(languages) || languages.length === 0) {
      return json({ error: 'languages[] required' }, 400)
    }

    const user = await new UserRepository(createDb(env.DB)).getById(userId)
    if (!user) return json({ error: 'Not found' }, 404)

    const apiOrigin = env.API_ORIGIN || 'https://starthn-func-prod.azurewebsites.net'
    const azureRes = await fetch(`${apiOrigin}/api/user/page/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Host: new URL(apiOrigin).host,
        // Azure trusts X-Internal-Auth + X-User-Id; the user's token is not forwarded.
        'X-Internal-Auth': env.SYNC_SECRET,
        'X-User-Id': userId,
      },
      body: JSON.stringify({ languages, bio: user.bio ?? null, pageContent: user.pageContent ?? null }),
    })

    if (!azureRes.ok) {
      console.error('[page-translate] azure', azureRes.status, await azureRes.text().catch(() => ''))
      return json({ error: 'Translation service unavailable' }, 502)
    }

    const data = (await azureRes.json()) as {
      translations?: Record<string, { bio?: string; pageContent?: string; isAutoTranslated?: boolean; translatedAt?: string }>
    }
    const translations = data.translations ?? {}

    // Persist each returned translation to D1 (upsert). page_content is stored
    // JSON-encoded to match the manual PUT path and the GET reader's JSON.parse.
    for (const [locale, t] of Object.entries(translations)) {
      const now = t.translatedAt ?? new Date().toISOString()
      const pageContent = t.pageContent != null ? JSON.stringify(t.pageContent) : null
      const existing = await env.DB.prepare(
        'SELECT id FROM user_page_translations WHERE user_id = ? AND locale = ?',
      ).bind(userId, locale).first<{ id: string }>()

      if (existing) {
        await env.DB.prepare(
          'UPDATE user_page_translations SET bio = ?, page_content = ?, is_auto_translated = 1, translated_at = ? WHERE user_id = ? AND locale = ?',
        ).bind(t.bio ?? null, pageContent, now, userId, locale).run()
      } else {
        await env.DB.prepare(
          'INSERT INTO user_page_translations (id, user_id, locale, bio, page_content, is_auto_translated, translated_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
        ).bind(crypto.randomUUID().replace(/-/g, ''), userId, locale, t.bio ?? null, pageContent, now).run()
      }
    }

    return json(translations)
  }

  const db = createDb(env.DB)
  const userRepo = new UserRepository(db)
  const apiKeyRepo = new ApiKeyRepository(db)

  try {
    // ─── Own profile ───────────────────────────────────
    if (path === '/api/user/profile') {
      if (method === 'GET') {
        const user = await userRepo.getById(userId)
        if (!user) return json({ error: 'Not found' }, 404)
        return json(user)
      }

      if (method === 'PUT') {
        const body = await request.json() as Record<string, any>
        const updated = await userRepo.updateProfile(userId, body)
        if (!updated) return json({ error: 'Not found' }, 404)
        return json(updated)
      }
    }

    // ─── Change password ──────────────────────────────
    if (path === '/api/user/change-password' && method === 'POST') {
      const body = await request.json() as { currentPassword?: string; newPassword?: string }
      if (!body.currentPassword || !body.newPassword) {
        return json({ error: 'Missing currentPassword or newPassword' }, 400)
      }

      const user = await userRepo.getByEmail(auth.payload.email)
      if (!user || !user.passwordHash) {
        return json({ error: 'Cannot change password for OAuth accounts' }, 400)
      }

      const valid = await bcrypt.compare(body.currentPassword, user.passwordHash)
      if (!valid) return json({ error: 'Current password incorrect' }, 400)

      const newHash = await bcrypt.hash(body.newPassword, 10)
      await userRepo.updatePasswordHash(userId, newHash)
      return json({ message: 'Password changed' })
    }

    // ─── API Keys ──────────────────────────────────────
    if (path === '/api/user/api-keys') {
      if (method === 'GET') {
        const keys = await apiKeyRepo.listByUser(userId)
        return json(keys)
      }

      if (method === 'POST') {
        const body = await request.json() as { name?: string; expiresAt?: string }
        if (!body.name) return json({ error: 'Missing name' }, 400)

        // Generate raw key (ht_ prefix)
        const rawKey = `ht_${crypto.randomUUID().replace(/-/g, '')}`

        // Hash with SHA-256 to match Azure backend
        const keyHashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey))
        const keyHash = Array.from(new Uint8Array(keyHashBuf))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')

        const keyPrefix = rawKey.slice(0, 8)
        const keySuffix = rawKey.slice(-4)

        const keyId = await apiKeyRepo.create(userId, body.name, keyHash, keyPrefix, keySuffix, body.expiresAt)

        return json({ id: keyId, key: rawKey, name: body.name }, 201)
      }
    }

    // ─── Delete API Key ────────────────────────────────
    const apiKeyDeleteMatch = path.match(/^\/api\/user\/api-keys\/([^/]+)$/)
    if (apiKeyDeleteMatch && method === 'DELETE') {
      const keyId = apiKeyDeleteMatch[1]
      await apiKeyRepo.delete(userId, keyId)
      return new Response(null, { status: 204 })
    }

    // ─── Page translations ────────────────────────────
    if (path === '/api/user/page/translations') {
      if (method === 'GET') {
        const rows = await env.DB.prepare(
          'SELECT locale, bio, page_content, is_auto_translated, translated_at FROM user_page_translations WHERE user_id = ?'
        ).bind(userId).all<{
          locale: string
          bio: string | null
          page_content: string | null
          is_auto_translated: number
          translated_at: string | null
        }>()

        const result: Record<string, any> = {}
        for (const r of rows.results ?? []) {
          result[r.locale] = {
            bio: r.bio,
            pageContent: r.page_content ? JSON.parse(r.page_content) : [],
            isAutoTranslated: r.is_auto_translated === 1,
            translatedAt: r.translated_at,
          }
        }
        return json(result)
      }
    }

    // ─── Page translation by locale ────────────────────
    const pageTransLocaleMatch = path.match(/^\/api\/user\/page\/translations\/([^/]+)$/)
    if (pageTransLocaleMatch) {
      const locale = pageTransLocaleMatch[1]

      if (method === 'PUT') {
        const body = await request.json() as { bio?: string; pageContent?: any[] }

        // Check if translation exists
        const existing = await env.DB.prepare(
          'SELECT id FROM user_page_translations WHERE user_id = ? AND locale = ?'
        ).bind(userId, locale).first<{ id: string }>()

        const now = new Date().toISOString()

        if (existing) {
          // Update existing
          const updates: string[] = ['translated_at = ?']
          const params: unknown[] = [now]

          if (body.bio !== undefined) {
            updates.unshift('bio = ?')
            params.unshift(body.bio)
          }
          if (body.pageContent !== undefined) {
            updates.unshift('page_content = ?')
            params.unshift(JSON.stringify(body.pageContent))
          }

          params.push(userId, locale)

          await env.DB.prepare(
            `UPDATE user_page_translations SET ${updates.join(', ')} WHERE user_id = ? AND locale = ?`
          ).bind(...params).run()
        } else {
          // Insert new
          const id = crypto.randomUUID().replace(/-/g, '')
          await env.DB.prepare(
            'INSERT INTO user_page_translations (id, user_id, locale, bio, page_content, is_auto_translated, translated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            id,
            userId,
            locale,
            body.bio ?? null,
            body.pageContent ? JSON.stringify(body.pageContent) : null,
            0,
            now
          ).run()
        }

        // Return updated row
        const row = await env.DB.prepare(
          'SELECT locale, bio, page_content, is_auto_translated, translated_at FROM user_page_translations WHERE user_id = ? AND locale = ?'
        ).bind(userId, locale).first<any>()

        return json(row)
      }

      if (method === 'DELETE') {
        await env.DB.prepare(
          'DELETE FROM user_page_translations WHERE user_id = ? AND locale = ?'
        ).bind(userId, locale).run()
        return new Response(null, { status: 204 })
      }
    }

    // ─── Delete avatar ─────────────────────────────────
    if (path === '/api/user/avatar' && method === 'DELETE') {
      const user = await userRepo.getById(userId)
      if (user?.avatarUrl) {
        // Normalize: strip /img/ prefix if present (legacy or new paths without prefix are both valid)
        const r2Prefix = user.avatarUrl.startsWith('/img/')
          ? user.avatarUrl.slice(5)
          : user.avatarUrl
        if (r2Prefix.startsWith('avatars/')) {
          const listed = await env.IMG_CACHE?.list({ prefix: r2Prefix })
          await Promise.all(
            (listed?.objects ?? []).map((obj: { key: string }) =>
              env.IMG_CACHE?.delete(obj.key)
            )
          )
          await env.DB.prepare('DELETE FROM processed_images WHERE path = ?')
            .bind(r2Prefix)
            .run()
        }
      }
      await userRepo.updateProfile(userId, { avatarUrl: null })
      return new Response(null, { status: 204 })
    }

  } catch (err) {
    console.error('[profile-route]', err)
    return json({ error: 'Internal server error' }, 500)
  }

  // No route matched
  return null
}
