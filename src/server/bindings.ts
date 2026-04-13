/**
 * Shared Cloudflare Worker bindings type.
 *
 * Mirrors the bindings declared in wrangler.jsonc and the secrets set
 * via `wrangler secret put`. Imported by both `src/server.ts` (the Hono
 * app root) and any route handler modules under `src/server/*` so they
 * agree on a single environment shape.
 */
export interface ImageWriteMessage {
  r2Key: string
  blobUrl: string
  contentType: string
  timestamp: number
}

export type Bindings = {
  DB: D1Database
  ASSETS: Fetcher
  IMG_CACHE: R2Bucket
  IMG_WRITE_QUEUE: Queue<ImageWriteMessage>
  API_ORIGIN: string
  JWT_SECRET: string
  SYNC_SECRET: string
}
