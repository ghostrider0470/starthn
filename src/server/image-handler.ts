import type { Context } from 'hono'
import type { Bindings, ImageWriteMessage } from './bindings'
import { CircuitBreaker } from './circuit-breaker'

const AZURE_BLOB_ORIGIN = 'https://htstorageprod.blob.core.windows.net'

const CONTAINER_WIDTHS: Record<string, number[]> = {
  avatars: [48, 96, 192],
  'blog-images': [400, 800, 1200, 1600, 2000],
  'page-images': [400, 800, 1200, 1600, 2000],
}

// Module-level circuit breaker (persists across requests within a Worker isolate)
const azureBreaker = new CircuitBreaker(3, 60_000)

export function snapWidth(requested: number, available: number[]): number {
  if (available.length === 0) {
    throw new Error('snapWidth: available widths array is empty')
  }
  const sorted = [...available].sort((a, b) => a - b)
  for (const w of sorted) {
    if (w >= requested) return w
  }
  return sorted[sorted.length - 1]
}

export function isStale(r2Key: string, manifestTimestamp: number): boolean {
  const match = r2Key.match(/-v(\d+)\.webp$/)
  if (!match) return false
  return parseInt(match[1], 10) < manifestTimestamp
}

function parseContainer(blobPath: string): string | null {
  const slash = blobPath.indexOf('/')
  if (slash < 0) return null
  const container = blobPath.slice(0, slash)
  return container in CONTAINER_WIDTHS ? container : null
}

interface ManifestRow {
  processed_at: string
  widths: string
  container: string
}

export async function handleImageRequest(
  c: Context<{ Bindings: Bindings }>,
): Promise<Response> {
  const blobPath = c.req.path.slice(5) // strip `/img/`
  const container = parseContainer(blobPath)
  if (!container) return new Response('Unknown container', { status: 400 })

  const url = new URL(c.req.url)
  const w = parseInt(url.searchParams.get('w') ?? '0', 10)
  const q = url.searchParams.get('q') ?? '80'
  const f = url.searchParams.get('f') ?? 'webp'

  // 1. Edge cache
  const cache = caches.default
  const cacheKey = new Request(c.req.url, { method: 'GET' })
  const cached = await cache.match(cacheKey)
  if (cached) return cached

  // 2. D1 manifest lookup
  let manifest: ManifestRow | null = null
  try {
    manifest = await c.env.DB.prepare(
      'SELECT processed_at, widths, container FROM processed_images WHERE path = ?',
    )
      .bind(blobPath)
      .first<ManifestRow>()
  } catch (err) {
    console.error('[img] D1 lookup failed', err)
  }

  // No manifest = image was deleted or never existed — do not fall through to Azure
  if (!manifest) return new Response('Not found', { status: 404 })

  if (w > 0) {
    const available = CONTAINER_WIDTHS[container]
    const snapped = snapWidth(w, available)
    const version = Math.floor(new Date(manifest.processed_at).getTime() / 1000)
    const r2Key = `${blobPath}/w${snapped}-v${version}.webp`

    // 3a. R2 check (with staleness detection)
    const r2Object = await c.env.IMG_CACHE.get(r2Key)
    if (r2Object && !isStale(r2Key, version)) {
      const headers = new Headers()
      r2Object.writeHttpMetadata(headers)
      headers.set('etag', r2Object.httpEtag)
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      headers.set('X-Cache', 'R2')
      const res = new Response(r2Object.body, { headers })
      c.executionCtx?.waitUntil(cache.put(cacheKey, res.clone()))
      return res
    }

    // 3b. Azure variant (circuit breaker protected)
    if (!azureBreaker.isOpen()) {
      const azureVariantUrl = `${AZURE_BLOB_ORIGIN}/${blobPath}/w${snapped}.webp`
      try {
        const upstream = await fetch(azureVariantUrl)
        if (upstream.ok && upstream.body) {
          azureBreaker.recordSuccess()
          const body = await upstream.arrayBuffer()
          const headers = new Headers()
          headers.set('Cache-Control', 'public, max-age=31536000, immutable')
          headers.set('Content-Type', 'image/webp')
          headers.set('Access-Control-Allow-Origin', '*')
          headers.set('X-Cache', 'MISS-QUEUED')

          // Enqueue durable R2 write instead of fire-and-forget
          c.executionCtx?.waitUntil(
            c.env.IMG_WRITE_QUEUE.send({
              r2Key,
              blobUrl: azureVariantUrl,
              contentType: 'image/webp',
              timestamp: Date.now(),
            } satisfies ImageWriteMessage),
          )

          const res = new Response(body, { status: 200, headers })
          c.executionCtx?.waitUntil(cache.put(cacheKey, res.clone()))
          return res
        }
      } catch (err) {
        azureBreaker.recordFailure()
        console.error('[img] Azure fetch failed, circuit breaker recording failure', err)
      }
    } else {
      // Circuit open — skip Azure, fall through to CF Image Resizing
      console.warn('[img] circuit breaker open, using CF Image Resizing fallback')
    }
  }

  // 4. Fallback: original + CF Image Resizing
  const fetchOpts: RequestInit & { cf?: Record<string, unknown> } =
    w > 0
      ? { cf: { image: { width: w, quality: parseInt(q, 10), format: f, fit: 'scale-down' } } }
      : {}
  const upstream = await fetch(`${AZURE_BLOB_ORIGIN}/${blobPath}`, fetchOpts)
  if (!upstream.ok) return new Response('Not found', { status: 404 })

  const headers = new Headers(upstream.headers)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('X-Cache', azureBreaker.isOpen() ? 'CIRCUIT-OPEN' : 'FALLBACK')
  headers.delete('x-ms-request-id')
  headers.delete('x-ms-version')

  const cachedResponse = new Response(upstream.body, { status: 200, headers })
  c.executionCtx?.waitUntil(cache.put(cacheKey, cachedResponse.clone()))
  return cachedResponse
}
