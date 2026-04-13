import type { Context } from 'hono'
import type { Bindings } from './bindings'

const AZURE_BLOB_ORIGIN = 'https://starthnstorage.blob.core.windows.net'

interface WarmPayload {
  items: Array<{
    r2Key: string
    blobPath: string
    width: number
  }>
}

export async function handleImageWarm(
  c: Context<{ Bindings: Bindings }>,
): Promise<Response> {
  const secret = c.req.header('X-Internal-Auth')
  if (secret !== c.env.SYNC_SECRET) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  const payload: WarmPayload = await c.req.json()
  if (!payload.items?.length) {
    return c.json({ error: 'items required' }, 400)
  }

  const results: Array<{ r2Key: string; ok: boolean; error?: string }> = []

  for (const item of payload.items) {
    try {
      const azureUrl = `${AZURE_BLOB_ORIGIN}/${item.blobPath}/w${item.width}.webp`
      const response = await fetch(azureUrl)
      if (!response.ok || !response.body) {
        results.push({ r2Key: item.r2Key, ok: false, error: `fetch ${response.status}` })
        continue
      }
      await c.env.IMG_CACHE.put(item.r2Key, response.body, {
        httpMetadata: { contentType: 'image/webp' },
      })
      results.push({ r2Key: item.r2Key, ok: true })
    } catch (err) {
      results.push({ r2Key: item.r2Key, ok: false, error: String(err) })
    }
  }

  return c.json({ ok: true, results })
}
