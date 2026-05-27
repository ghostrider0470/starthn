import { verifyJwt, hasPermission, hasRole } from '../auth'

interface UploadEnv {
  DB: D1Database
  IMG_CACHE: R2Bucket
  JWT_SECRET: string
}

const CONTAINER_WIDTHS: Record<string, number[]> = {
  'blog-images': [400, 800, 1200, 1600, 2000],
  'avatars': [48, 96, 192],
  'page-images': [400, 800, 1200, 1600, 2000],
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}


export async function handleUploadRoute(
  request: Request,
  env: UploadEnv,
): Promise<Response | null> {
  if (request.method !== 'POST') return null
  if (new URL(request.url).pathname !== '/api/upload/image') return null
  if (!env?.DB || !env?.IMG_CACHE || !env?.JWT_SECRET) return null

  const authHeader = request.headers.get('X-Authorization') || request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
  const payload = await verifyJwt(authHeader.slice(7), env.JWT_SECRET)
  if (!payload?.sub) return json({ error: 'Unauthorized' }, 401)

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return json({ error: 'Invalid form data' }, 400)
  }

  const container = formData.get('container') as string | null
  if (!container || !CONTAINER_WIDTHS[container]) {
    return json({ error: 'Invalid container' }, 400)
  }

  if (container === 'blog-images' && !hasPermission(payload, 'manage:blog') && !hasRole(payload, 'MasterAdmin', 'superadmin')) {
    return json({ error: 'Forbidden' }, 403)
  }

  const uuid = crypto.randomUUID().replace(/-/g, '')
  const userId = payload.sub
  const basePath =
    container === 'avatars' || container === 'page-images'
      ? `${container}/${userId}/${uuid}`
      : `${container}/${uuid}`

  const now = new Date().toISOString()
  const version = Math.floor(Date.now() / 1000)
  const uploadedWidths: number[] = []
  const writtenKeys: string[] = []

  try {
    for (const width of CONTAINER_WIDTHS[container]) {
      const file = formData.get(`w${width}`) as File | null
      if (!file) continue
      const r2Key = `${basePath}/w${width}-v${version}.webp`
      await env.IMG_CACHE.put(r2Key, await file.arrayBuffer(), {
        httpMetadata: { contentType: 'image/webp' },
      })
      writtenKeys.push(r2Key)
      uploadedWidths.push(width)
    }

    if (uploadedWidths.length === 0) return json({ error: 'No variants provided' }, 400)

    await env.DB.prepare(
      'INSERT INTO processed_images (path, container, format, widths, processed_at, source) VALUES (?, ?, ?, ?, ?, ?)',
    )
      .bind(basePath, container, 'webp', JSON.stringify(uploadedWidths), now, 'worker')
      .run()
  } catch (err) {
    console.error('[upload] failed, rolling back R2 writes', err)
    await Promise.allSettled(writtenKeys.map(key => env.IMG_CACHE.delete(key)))
    return json({ error: 'Upload failed' }, 500)
  }

  return json({ path: basePath, url: `/img/${basePath}` })
}
