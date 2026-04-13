/**
 * Async sync: after D1 writes succeed, replay the mutation to Azure in the background.
 * Uses ctx.waitUntil() so the Worker responds immediately while sync happens async.
 * If Azure is down, the D1 write already succeeded — eventual consistency.
 */

interface SyncOptions {
  apiOrigin: string
  method: string
  path: string
  body?: unknown
  token?: string
}

async function doSync(opts: SyncOptions): Promise<void> {
  const { apiOrigin, method, path, body, token } = opts
  const url = `${apiOrigin}${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['X-Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      console.error(`[sync] ${method} ${path} → ${res.status}`)
    }
  } catch (err) {
    console.error(`[sync] ${method} ${path} failed:`, err)
  }
}

/**
 * Fire-and-forget sync to Azure.
 * Call after a successful D1 write to keep Azure/MongoDB in sync.
 */
export function syncToAzure(
  ctx: ExecutionContext,
  apiOrigin: string,
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): void {
  ctx.waitUntil(doSync({ apiOrigin, method, path, body, token }))
}
