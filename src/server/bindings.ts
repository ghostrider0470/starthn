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
  AZURE_BLOB_ORIGIN: string
  JWT_SECRET: string
  SYNC_SECRET: string
  /** "true" = Workers own auth+admin D1 routes; "false" = proxy to Azure */
  D1_PRIMARY: string
  /** Comma-separated emails that get MasterAdmin role on first registration */
  ADMIN_EMAILS: string
  MICROSOFT_CLIENT_ID: string
  MICROSOFT_CLIENT_SECRET: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  /** "true" = return 503 for all write endpoints during cutover window */
  MAINTENANCE_MODE: string
}
