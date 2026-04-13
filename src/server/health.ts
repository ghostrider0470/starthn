import type { Context } from 'hono'
import type { Bindings } from './bindings'

export async function handleHealth(
  c: Context<{ Bindings: Bindings }>,
): Promise<Response> {
  const secret = c.req.header('X-Internal-Auth')
  if (secret !== c.env.SYNC_SECRET) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  const [posts, users, cats, tags, roles] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT COUNT(*) as c FROM blog_posts'),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM users'),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM categories'),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM tags'),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM roles'),
  ])

  const lastSync = await c.env.DB.prepare(
    'SELECT MAX(updated_at) as last FROM blog_posts',
  ).first<{ last: string | null }>()

  const age =
    lastSync?.last != null
      ? Math.round((Date.now() - new Date(lastSync.last).getTime()) / 1000)
      : null

  return c.json({
    status: age !== null && age < 300 ? 'healthy' : 'stale',
    counts: {
      blogPosts: (posts.results?.[0] as Record<string, number>)?.c ?? 0,
      users: (users.results?.[0] as Record<string, number>)?.c ?? 0,
      categories: (cats.results?.[0] as Record<string, number>)?.c ?? 0,
      tags: (tags.results?.[0] as Record<string, number>)?.c ?? 0,
      roles: (roles.results?.[0] as Record<string, number>)?.c ?? 0,
    },
    lastSync: lastSync?.last,
    syncAgeSeconds: age,
    timestamp: new Date().toISOString(),
  })
}
