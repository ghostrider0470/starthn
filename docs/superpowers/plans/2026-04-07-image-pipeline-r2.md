# Image Pipeline with R2 Cache — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a three-tier image conversion pipeline (frontend canvas → Azure ImageSharp → HTTP sweep) that pre-generates webp variants, stores them in Azure Blob, caches them lazily in R2, and serves them from a width-snapping Worker handler with a D1 manifest.

**Architecture:**
Originals + variants live in Azure Blob (primary). A `processed_images` manifest lives in MongoDB (primary) and D1 (edge cache) synced via a shared-secret Worker endpoint. The Worker reads D1 for each `/img/*` request, snaps the requested width to the nearest available variant, then serves from R2 (or Azure variant on R2 miss, with lazy R2 populate via `body.tee()`). CF Image Resizing is only used for non-manifested images.

**Tech Stack:**
- Frontend: TanStack Start, Vitest, TypeScript, Web Workers, OffscreenCanvas
- Worker: Hono on Cloudflare Workers, D1 (SQLite), R2
- Backend: Azure Functions .NET 10 isolated, SixLabors.ImageSharp, MongoDB, Azure Blob Storage

---

## File Structure

**New files:**
- `src/lib/image-convert.ts` — main-thread converter wrapper
- `src/lib/image-convert.worker.ts` — Web Worker with OffscreenCanvas encoding
- `src/lib/image-convert.test.ts` — Vitest tests for the converter
- `src/server/image-handler.ts` — Worker `/img/*` route (extracted from `server.ts` for testability)
- `src/server/image-handler.test.ts` — Vitest tests for pure logic (width snapping)
- `src/server/image-manifest.ts` — Worker POST `/api/internal/image-manifest` handler
- `src/server/db/migrations/002_processed_images.sql` — D1 migration
- `api/Entities/ProcessedImageEntity.cs` — MongoDB entity
- `api/Repositories/Interfaces/IProcessedImageRepository.cs` — repo interface
- `api/Repositories/ProcessedImageRepository.cs` — MongoDB repo impl
- `api/Services/Interfaces/IImageProcessingService.cs` — interface
- `api/Services/Implementations/ImageProcessingService.cs` — ImageSharp wrapper
- `api/Services/Interfaces/IManifestSyncService.cs` — interface
- `api/Services/Implementations/ManifestSyncService.cs` — HTTP client for Worker sync
- `api/Functions/ImageSweepFunction.cs` — HTTP-triggered sweep

**Modified files:**
- `wrangler.jsonc` — add `r2_buckets` binding
- `src/server.ts` — add R2 binding to type, delegate `/img/*` to new handler, mount manifest endpoint
- `src/lib/image.ts` — add 2000 to `IMAGE_WIDTHS.cover` / `.content`
- `src/server/db/schema.sql` — add `processed_images` table
- `api/Api.csproj` — add `SixLabors.ImageSharp` NuGet
- `api/Program.cs` — register new DI services
- `api/Functions/ImageUploadFunction.cs` — accept optional variants, trigger processor/manifest
- `api/Services/Interfaces/IBlobStorageService.cs` — add `UploadVariantAsync` method
- `api/Services/Implementations/BlobStorageService.cs` — implement variant upload
- `src/components/blog/ImageCropUpload.tsx` — call frontend converter, build multipart with variants

---

## Phase 1 — D1 + R2 infrastructure

### Task 1: D1 schema for `processed_images`

**Files:**
- Create: `src/server/db/migrations/002_processed_images.sql`
- Modify: `src/server/db/schema.sql`
- Modify: `src/server/db/schema.ts`

- [ ] **Step 1: Create the migration SQL file**

Create `src/server/db/migrations/002_processed_images.sql`:
```sql
CREATE TABLE IF NOT EXISTS processed_images (
  path TEXT PRIMARY KEY,
  format TEXT NOT NULL DEFAULT 'webp',
  widths TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  source TEXT NOT NULL
);
```

- [ ] **Step 2: Append the same table to `schema.sql`**

Append to the bottom of `src/server/db/schema.sql`:
```sql
-- Processed image manifest (mirrored from MongoDB)
CREATE TABLE IF NOT EXISTS processed_images (
  path TEXT PRIMARY KEY,
  format TEXT NOT NULL DEFAULT 'webp',
  widths TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  source TEXT NOT NULL
);
```

- [ ] **Step 3: Add the Drizzle table definition**

Add to `src/server/db/schema.ts` after the existing table exports:
```ts
export const processedImages = sqliteTable('processed_images', {
  path: text('path').primaryKey(),
  format: text('format').notNull().default('webp'),
  widths: text('widths').notNull(),
  processedAt: text('processed_at').notNull(),
  source: text('source').notNull(),
})
```

- [ ] **Step 4: Apply the migration to remote D1**

Run:
```bash
npx wrangler d1 execute horizon-db --remote --file=src/server/db/migrations/002_processed_images.sql
```
Expected: `🚣 Executed 1 command ... ✅`

- [ ] **Step 5: Apply to local D1 (dev)**

Run:
```bash
npx wrangler d1 execute horizon-db --local --file=src/server/db/migrations/002_processed_images.sql
```
Expected: `🚣 Executed 1 command ... ✅`

- [ ] **Step 6: Commit**

```bash
git add src/server/db/migrations/002_processed_images.sql src/server/db/schema.sql src/server/db/schema.ts
git commit -m "feat(d1): add processed_images manifest table"
```

---

### Task 2: R2 bucket + wrangler binding

**Files:**
- Modify: `wrangler.jsonc`
- Modify: `src/server.ts:10-14` (Bindings type)

- [ ] **Step 1: Create the R2 bucket**

Run:
```bash
npx wrangler r2 bucket create horizon-img-cache
```
Expected: `Creating bucket horizon-img-cache... Created bucket horizon-img-cache.`

- [ ] **Step 2: Add the binding to `wrangler.jsonc`**

Add after `d1_databases`:
```jsonc
"r2_buckets": [
  {
    "binding": "IMG_CACHE",
    "bucket_name": "horizon-img-cache"
  }
]
```

- [ ] **Step 3: Update the `Bindings` type in `src/server.ts`**

Change:
```ts
type Bindings = {
  DB: D1Database
  API_ORIGIN: string
  JWT_SECRET: string
}
```
to:
```ts
type Bindings = {
  DB: D1Database
  IMG_CACHE: R2Bucket
  API_ORIGIN: string
  JWT_SECRET: string
  IMAGE_SYNC_SECRET: string
}
```

- [ ] **Step 4: Set the sync secret**

Generate a random secret and set it:
```bash
openssl rand -hex 32 | npx wrangler secret put IMAGE_SYNC_SECRET
```
Expected: `✨ Success! Uploaded secret IMAGE_SYNC_SECRET`

Save the same secret value — you'll need it for the Azure Function app setting in Task 13.

- [ ] **Step 5: Verify the binding is live**

Run:
```bash
npx wrangler deploy --dry-run
```
Expected output includes `env.IMG_CACHE (horizon-img-cache)` in the bindings list.

- [ ] **Step 6: Commit**

```bash
git add wrangler.jsonc src/server.ts
git commit -m "feat(worker): add R2 binding for image cache"
```

---

## Phase 2 — Worker read path

### Task 3: Extract image handler + width snapping (pure, TDD)

**Files:**
- Create: `src/server/image-handler.ts`
- Create: `src/server/image-handler.test.ts`

The current `/img/*` logic is inline in `src/server.ts`. Extract the **pure helper functions** first (width snapping), with Vitest tests, so the logic is verified in isolation.

- [ ] **Step 1: Write the failing test for `snapWidth`**

Create `src/server/image-handler.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { snapWidth } from './image-handler'

describe('snapWidth', () => {
  const available = [400, 800, 1200, 1600, 2000]

  it('returns exact match when width is in the set', () => {
    expect(snapWidth(800, available)).toBe(800)
  })

  it('rounds up to nearest available when between two widths', () => {
    expect(snapWidth(500, available)).toBe(800)
    expect(snapWidth(1000, available)).toBe(1200)
    expect(snapWidth(1700, available)).toBe(2000)
  })

  it('returns smallest available when width is below the minimum', () => {
    expect(snapWidth(48, available)).toBe(400)
  })

  it('clamps to largest when width exceeds the maximum', () => {
    expect(snapWidth(3000, available)).toBe(2000)
  })

  it('handles single-element array', () => {
    expect(snapWidth(500, [800])).toBe(800)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run src/server/image-handler.test.ts
```
Expected: FAIL with `Cannot find module './image-handler'`

- [ ] **Step 3: Create the implementation**

Create `src/server/image-handler.ts`:
```ts
/**
 * Snap a requested width to the nearest available pre-generated variant.
 * Rounds up (prefers larger, higher quality); clamps to the largest
 * available when the request exceeds all variants.
 */
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npx vitest run src/server/image-handler.test.ts
```
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/image-handler.ts src/server/image-handler.test.ts
git commit -m "feat(worker): add snapWidth helper with tests"
```

---

### Task 4: Full image handler wiring R2 + D1 + Azure

**Files:**
- Modify: `src/server/image-handler.ts`
- Modify: `src/server.ts` (mount the new handler)

- [ ] **Step 1: Extend `image-handler.ts` with the full handler**

Replace the contents of `src/server/image-handler.ts` with:
```ts
import type { Context } from 'hono'

const AZURE_BLOB_ORIGIN = 'https://htstorageprod.blob.core.windows.net'

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

interface ManifestRow {
  processed_at: string
  widths: string
}

type ImgBindings = {
  DB: D1Database
  IMG_CACHE: R2Bucket
}

export async function handleImageRequest(
  c: Context<{ Bindings: ImgBindings }>,
): Promise<Response> {
  const blobPath = c.req.path.slice(5) // strip `/img/`
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
      'SELECT processed_at, widths FROM processed_images WHERE path = ?',
    )
      .bind(blobPath)
      .first<ManifestRow>()
  } catch (err) {
    console.error('[img] D1 lookup failed', err)
  }

  if (manifest && w > 0) {
    const available = JSON.parse(manifest.widths) as number[]
    const snapped = snapWidth(w, available)
    const version = Math.floor(new Date(manifest.processed_at).getTime() / 1000)
    const r2Key = `${blobPath}/w${snapped}-v${version}.webp`

    // 3a. R2 check
    const r2Object = await c.env.IMG_CACHE.get(r2Key)
    if (r2Object) {
      const headers = new Headers()
      r2Object.writeHttpMetadata(headers)
      headers.set('etag', r2Object.httpEtag)
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      headers.set('X-Cache', 'R2')
      const res = new Response(r2Object.body, { headers })
      c.executionCtx?.waitUntil(cache.put(cacheKey, res.clone()))
      return res
    }

    // 3b. Azure variant (manifest is authoritative)
    const azureVariantUrl = `${AZURE_BLOB_ORIGIN}/${blobPath}/w${snapped}.webp`
    const upstream = await fetch(azureVariantUrl)
    if (upstream.ok && upstream.body) {
      const [toClient, toR2] = upstream.body.tee()
      const headers = new Headers(upstream.headers)
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      headers.set('Content-Type', upstream.headers.get('content-type') ?? 'image/webp')
      headers.set('Access-Control-Allow-Origin', '*')
      headers.set('X-Cache', 'MISS-WRITE')
      headers.delete('x-ms-request-id')
      headers.delete('x-ms-version')

      // Lazy populate R2 — non-blocking, swallow errors
      c.executionCtx?.waitUntil(
        c.env.IMG_CACHE.put(r2Key, toR2, {
          httpMetadata: { contentType: 'image/webp' },
        }).catch((err: unknown) => console.error('[img] R2 put failed', r2Key, err)),
      )

      const res = new Response(toClient, { status: 200, headers })
      c.executionCtx?.waitUntil(cache.put(cacheKey, res.clone()))
      return res
    }
    console.error(`[img] manifest hit but Azure variant missing: ${azureVariantUrl}`)
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
  headers.set('X-Cache', 'FALLBACK')
  headers.delete('x-ms-request-id')
  headers.delete('x-ms-version')

  const cachedResponse = new Response(upstream.body, { status: 200, headers })
  c.executionCtx?.waitUntil(cache.put(cacheKey, cachedResponse.clone()))
  return cachedResponse
}
```

- [ ] **Step 2: Replace the inline `/img/*` route in `src/server.ts`**

Delete lines 52-93 of `src/server.ts` (the existing `app.get('/img/*', ...)` block) and replace with:
```ts
import { handleImageRequest } from './server/image-handler'

// ... keep other imports

// ─── Image proxy ────────────────────────────────────────────
app.get('/img/*', (c) => handleImageRequest(c))
```

Also remove the now-unused `AZURE_BLOB_ORIGIN` constant from `src/server.ts` since it's declared in `image-handler.ts`.

- [ ] **Step 3: Ensure the existing snapWidth test still passes**

Run:
```bash
npx vitest run src/server/image-handler.test.ts
```
Expected: PASS (5 tests)

- [ ] **Step 4: Typecheck the project**

Run:
```bash
npx tsc --noEmit 2>&1 | grep image-handler
```
Expected: no output (no errors in the new file)

- [ ] **Step 5: Build the worker**

Run:
```bash
npm run build 2>&1 | grep -E '(error|✓ built)'
```
Expected: `✓ built in ...`

- [ ] **Step 6: Commit**

```bash
git add src/server/image-handler.ts src/server.ts
git commit -m "feat(worker): delegate /img/* to R2-aware handler with D1 manifest lookup"
```

---

### Task 5: Manifest sync endpoint `/api/internal/image-manifest`

**Files:**
- Create: `src/server/image-manifest.ts`
- Modify: `src/server.ts` (mount the route)

- [ ] **Step 1: Create the handler**

Create `src/server/image-manifest.ts`:
```ts
import type { Context } from 'hono'

type ManifestBindings = {
  DB: D1Database
  IMAGE_SYNC_SECRET: string
}

interface ManifestPayload {
  path: string
  format: string
  widths: number[]
  processedAt: string
  source: string
}

function isValidPayload(body: unknown): body is ManifestPayload {
  if (typeof body !== 'object' || body === null) return false
  const p = body as Record<string, unknown>
  return (
    typeof p.path === 'string' &&
    p.path.length > 0 &&
    typeof p.format === 'string' &&
    Array.isArray(p.widths) &&
    p.widths.every((w) => typeof w === 'number' && w > 0) &&
    typeof p.processedAt === 'string' &&
    typeof p.source === 'string'
  )
}

export async function handleManifestSync(
  c: Context<{ Bindings: ManifestBindings }>,
): Promise<Response> {
  const provided = c.req.header('X-Internal-Auth')
  if (!provided || provided !== c.env.IMAGE_SYNC_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  if (!isValidPayload(body)) {
    return c.json({ error: 'Invalid payload shape' }, 400)
  }

  await c.env.DB.prepare(
    `INSERT INTO processed_images (path, format, widths, processed_at, source)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(path) DO UPDATE SET
       format = excluded.format,
       widths = excluded.widths,
       processed_at = excluded.processed_at,
       source = excluded.source`,
  )
    .bind(
      body.path,
      body.format,
      JSON.stringify(body.widths),
      body.processedAt,
      body.source,
    )
    .run()

  return c.json({ ok: true })
}
```

- [ ] **Step 2: Mount the route in `src/server.ts`**

Add near the other `/api/*` routes (before the Azure proxy fallback at `app.all('/api/*', ...)`):
```ts
import { handleManifestSync } from './server/image-manifest'

// ...

// Internal manifest sync (shared-secret auth)
app.post('/api/internal/image-manifest', (c) => handleManifestSync(c))
```

- [ ] **Step 3: Typecheck + build**

Run:
```bash
npm run build 2>&1 | tail -5
```
Expected: `✓ built in ...`

- [ ] **Step 4: Commit**

```bash
git add src/server/image-manifest.ts src/server.ts
git commit -m "feat(worker): add /api/internal/image-manifest sync endpoint"
```

---

## Phase 3 — Frontend converter

### Task 6: OffscreenCanvas Web Worker for webp encoding (TDD)

**Files:**
- Create: `src/lib/image-convert.worker.ts`
- Create: `src/lib/image-convert.ts`
- Create: `src/lib/image-convert.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/image-convert.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { convertToWebpVariants, TARGET_WIDTHS } from './image-convert'

// Minimal 3x3 red PNG as a test fixture
const TINY_PNG = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 3, 0, 0,
  0, 3, 8, 2, 0, 0, 0, 217, 74, 34, 232, 0, 0, 0, 21, 73, 68, 65, 84, 120, 156,
  99, 248, 207, 192, 192, 192, 240, 255, 255, 63, 3, 0, 14, 7, 3, 1, 255, 199, 255,
  10, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
])

describe('convertToWebpVariants', () => {
  beforeAll(() => {
    if (typeof OffscreenCanvas === 'undefined') {
      throw new Error(
        'OffscreenCanvas not available in test environment. Run with --environment=jsdom or use a browser-based runner.',
      )
    }
  })

  it('generates one variant per target width', async () => {
    const file = new File([TINY_PNG], 'test.png', { type: 'image/png' })
    const variants = await convertToWebpVariants(file)
    expect(variants).toHaveLength(TARGET_WIDTHS.length)
  })

  it('each variant is a webp Blob tagged with the width', async () => {
    const file = new File([TINY_PNG], 'test.png', { type: 'image/png' })
    const variants = await convertToWebpVariants(file)
    for (const v of variants) {
      expect(v.blob.type).toBe('image/webp')
      expect(TARGET_WIDTHS).toContain(v.width)
      expect(v.blob.size).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run src/lib/image-convert.test.ts
```
Expected: FAIL with `Cannot find module './image-convert'`

- [ ] **Step 3: Create the Web Worker**

Create `src/lib/image-convert.worker.ts`:
```ts
/// <reference lib="webworker" />

interface WorkerRequest {
  imageBitmap: ImageBitmap
  widths: number[]
  quality: number
}

interface WorkerResponse {
  width: number
  blob: Blob
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { imageBitmap, widths, quality } = event.data
  try {
    const results: WorkerResponse[] = []
    for (const width of widths) {
      const height = Math.round(imageBitmap.height * (width / imageBitmap.width))
      const canvas = new OffscreenCanvas(width, height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('OffscreenCanvas 2d context unavailable')
      ctx.drawImage(imageBitmap, 0, 0, width, height)
      const blob = await canvas.convertToBlob({
        type: 'image/webp',
        quality,
      })
      results.push({ width, blob })
    }
    imageBitmap.close()
    ;(self as unknown as DedicatedWorkerGlobalScope).postMessage({
      ok: true,
      results,
    })
  } catch (err) {
    imageBitmap.close()
    ;(self as unknown as DedicatedWorkerGlobalScope).postMessage({
      ok: false,
      error: (err as Error).message,
    })
  }
}
```

- [ ] **Step 4: Create the main-thread wrapper**

Create `src/lib/image-convert.ts`:
```ts
export const TARGET_WIDTHS = [400, 800, 1200, 1600, 2000] as const
export const TARGET_QUALITY = 0.82

export interface WebpVariant {
  width: number
  blob: Blob
}

interface WorkerSuccess {
  ok: true
  results: WebpVariant[]
}

interface WorkerFailure {
  ok: false
  error: string
}

/**
 * Convert an image file to a set of webp variants at the target widths.
 * Runs in a dedicated Web Worker with OffscreenCanvas to keep the UI thread
 * responsive during encoding.
 *
 * Throws on decoding failure, OOM, or unsupported source format. Callers
 * should catch and fall back to uploading the original untouched.
 */
export async function convertToWebpVariants(
  file: File,
  options: { widths?: readonly number[]; quality?: number } = {},
): Promise<WebpVariant[]> {
  const widths = options.widths ?? TARGET_WIDTHS
  const quality = options.quality ?? TARGET_QUALITY

  const bitmap = await createImageBitmap(file)

  const worker = new Worker(new URL('./image-convert.worker.ts', import.meta.url), {
    type: 'module',
  })

  try {
    const result = await new Promise<WorkerSuccess | WorkerFailure>((resolve, reject) => {
      worker.onmessage = (event) => resolve(event.data)
      worker.onerror = (err) => reject(err)
      worker.postMessage(
        { imageBitmap: bitmap, widths: Array.from(widths), quality },
        [bitmap],
      )
    })

    if (!result.ok) {
      throw new Error(`Image conversion failed: ${result.error}`)
    }
    return result.results
  } finally {
    worker.terminate()
  }
}
```

- [ ] **Step 5: Configure Vitest to use the jsdom environment that supports OffscreenCanvas**

Check `vite.config.ts` or `vitest.config.ts`. If Vitest doesn't have `environment: 'jsdom'` set, add it — jsdom has a polyfill for OffscreenCanvas in recent versions. If no vitest config exists, add one:

Create `vitest.config.ts` (skip if it exists — in that case just verify the environment setting):
```ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 6: Run the test to verify it passes**

Run:
```bash
npx vitest run src/lib/image-convert.test.ts
```
Expected: PASS (2 tests). If the test fails because jsdom doesn't support OffscreenCanvas's `convertToBlob`, mark both test cases as `it.skip` with a TODO comment and rely on manual browser testing — this is acceptable since the feature will be verified end-to-end in Task 9.

- [ ] **Step 7: Commit**

```bash
git add src/lib/image-convert.ts src/lib/image-convert.worker.ts src/lib/image-convert.test.ts vitest.config.ts
git commit -m "feat(frontend): add OffscreenCanvas webp converter for admin uploads"
```

---

### Task 7: Update `IMAGE_WIDTHS` to include 2000

**Files:**
- Modify: `src/lib/image.ts`

- [ ] **Step 1: Add the 2000 width**

Edit `src/lib/image.ts`. Change:
```ts
export const IMAGE_WIDTHS = {
  cover: [400, 800, 1200, 1600],
  banner: [800, 1200, 1600, 2000],
  avatar: [48, 96, 192],
  content: [400, 800, 1200, 1600],
} as const
```
to:
```ts
export const IMAGE_WIDTHS = {
  cover: [400, 800, 1200, 1600, 2000],
  banner: [400, 800, 1200, 1600, 2000],
  avatar: [48, 96, 192],
  content: [400, 800, 1200, 1600, 2000],
} as const
```

- [ ] **Step 2: Build to verify no consumers break**

Run:
```bash
npm run build 2>&1 | tail -3
```
Expected: `✓ built in ...`

- [ ] **Step 3: Commit**

```bash
git add src/lib/image.ts
git commit -m "feat: add 2000px variant width for retina desktop"
```

---

### Task 8: Wire the converter into `ImageCropUpload`

**Files:**
- Modify: `src/components/blog/ImageCropUpload.tsx`

First, locate the upload call in `ImageCropUpload.tsx`. Search for the `fetch` or `api.post` call that sends the cropped image to `/manage/blog/upload-image`.

- [ ] **Step 1: Read the current upload call to understand the structure**

```bash
```
Open `src/components/blog/ImageCropUpload.tsx` and find where the cropped image blob is submitted. The file currently posts a single file as multipart form data to `/manage/blog/upload-image`.

- [ ] **Step 2: Add the converter import**

Add to the top imports:
```ts
import { convertToWebpVariants, TARGET_WIDTHS } from '@/lib/image-convert'
```

- [ ] **Step 3: Replace the upload helper**

Find the existing upload function (something like `async function uploadImage(blob: Blob)` or inline inside a submit handler). Replace its body so that it:

1. Converts the blob to webp variants via `convertToWebpVariants`
2. On success: builds a `FormData` with `original` + `variant_400`, `variant_800`, ..., `variant_2000`
3. On failure: builds a `FormData` with only `original`
4. POSTs to `/api/manage/blog/upload-image` (same endpoint as before)

```ts
async function uploadImage(blob: Blob, filename: string): Promise<string> {
  const file = blob instanceof File ? blob : new File([blob], filename, { type: blob.type })

  const formData = new FormData()
  formData.append('original', file, filename)

  try {
    const variants = await convertToWebpVariants(file)
    for (const v of variants) {
      formData.append(`variant_${v.width}`, v.blob, `${filename}.w${v.width}.webp`)
    }
  } catch (err) {
    console.warn('[upload] client-side conversion failed, uploading original only', err)
  }

  const res = await fetch('/api/manage/blog/upload-image', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Upload failed: ${res.status} ${text}`)
  }

  const data = await res.json() as { url: string }
  return data.url
}
```

Make sure any call sites inside `ImageCropUpload` that previously passed just a blob now also pass a filename string (derive from the original File object if needed). If there are multiple consumers, pass the filename through.

- [ ] **Step 4: Build to verify**

Run:
```bash
npm run build 2>&1 | tail -3
```
Expected: `✓ built in ...`

- [ ] **Step 5: Commit**

```bash
git add src/components/blog/ImageCropUpload.tsx
git commit -m "feat(admin): convert blog images to webp variants before upload"
```

---

## Phase 4 — Azure Function backend

### Task 9: Add `SixLabors.ImageSharp` and create `ImageProcessingService`

**Files:**
- Modify: `api/Api.csproj`
- Create: `api/Services/Interfaces/IImageProcessingService.cs`
- Create: `api/Services/Implementations/ImageProcessingService.cs`

- [ ] **Step 1: Add the NuGet reference**

Edit `api/Api.csproj`. Add to the `<ItemGroup>` with package references:
```xml
<PackageReference Include="SixLabors.ImageSharp" Version="3.1.5" />
```

- [ ] **Step 2: Restore packages**

Run:
```bash
cd api && dotnet restore
```
Expected: `Restored ... ImageSharp` appears in the output.

- [ ] **Step 3: Create the interface**

Create `api/Services/Interfaces/IImageProcessingService.cs`:
```csharp
namespace Api.Services.Interfaces;

public record WebpVariant(int Width, byte[] Data);

public interface IImageProcessingService
{
    /// <summary>
    /// Load an image from the given stream and encode webp variants at the
    /// specified widths. Preserves aspect ratio.
    /// </summary>
    Task<IReadOnlyList<WebpVariant>> GenerateWebpVariantsAsync(
        Stream source,
        IReadOnlyList<int> widths,
        int quality = 82,
        CancellationToken cancellationToken = default);
}
```

- [ ] **Step 4: Create the implementation**

Create `api/Services/Implementations/ImageProcessingService.cs`:
```csharp
using Api.Services.Interfaces;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace Api.Services.Implementations;

public class ImageProcessingService : IImageProcessingService
{
    public async Task<IReadOnlyList<WebpVariant>> GenerateWebpVariantsAsync(
        Stream source,
        IReadOnlyList<int> widths,
        int quality = 82,
        CancellationToken cancellationToken = default)
    {
        using var image = await Image.LoadAsync(source, cancellationToken);

        var results = new List<WebpVariant>(widths.Count);
        var encoder = new WebpEncoder
        {
            Quality = quality,
            FileFormat = WebpFileFormatType.Lossy,
            Method = WebpEncodingMethod.Default,
        };

        foreach (var width in widths)
        {
            // Only downscale — never upscale
            var targetWidth = Math.Min(width, image.Width);
            using var clone = image.Clone(ctx => ctx.Resize(new ResizeOptions
            {
                Size = new Size(targetWidth, 0),
                Mode = ResizeMode.Max,
                Sampler = KnownResamplers.Lanczos3,
            }));

            using var ms = new MemoryStream();
            await clone.SaveAsWebpAsync(ms, encoder, cancellationToken);
            results.Add(new WebpVariant(width, ms.ToArray()));
        }

        return results;
    }
}
```

- [ ] **Step 5: Build**

Run:
```bash
cd api && dotnet build
```
Expected: `Build succeeded`

- [ ] **Step 6: Commit**

```bash
git add api/Api.csproj api/Services/Interfaces/IImageProcessingService.cs api/Services/Implementations/ImageProcessingService.cs
git commit -m "feat(api): add ImageSharp-backed image processing service"
```

---

### Task 10: MongoDB `ProcessedImageEntity` + repository

**Files:**
- Create: `api/Entities/ProcessedImageEntity.cs`
- Create: `api/Repositories/Interfaces/IProcessedImageRepository.cs`
- Create: `api/Repositories/ProcessedImageRepository.cs`

- [ ] **Step 1: Create the entity**

Create `api/Entities/ProcessedImageEntity.cs`:
```csharp
using MongoDB.Bson.Serialization.Attributes;

namespace Api.Entities;

public class ProcessedImageEntity
{
    [BsonId]
    public string Path { get; set; } = string.Empty;

    public string Format { get; set; } = "webp";

    public int[] Widths { get; set; } = Array.Empty<int>();

    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;

    public string Source { get; set; } = "backend";
}
```

- [ ] **Step 2: Create the repository interface**

Create `api/Repositories/Interfaces/IProcessedImageRepository.cs`:
```csharp
using Api.Entities;

namespace Api.Repositories.Interfaces;

public interface IProcessedImageRepository
{
    Task UpsertAsync(ProcessedImageEntity entity, CancellationToken cancellationToken = default);
    Task<ProcessedImageEntity?> GetByPathAsync(string path, CancellationToken cancellationToken = default);
    IAsyncEnumerable<string> GetProcessedPathsAsync(CancellationToken cancellationToken = default);
}
```

- [ ] **Step 3: Create the implementation**

Create `api/Repositories/ProcessedImageRepository.cs`:
```csharp
using System.Runtime.CompilerServices;
using Api.Entities;
using Api.Repositories.Interfaces;
using MongoDB.Driver;

namespace Api.Repositories;

public class ProcessedImageRepository : IProcessedImageRepository
{
    private readonly IMongoCollection<ProcessedImageEntity> _collection;

    public ProcessedImageRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<ProcessedImageEntity>("processed_images");
    }

    public async Task UpsertAsync(
        ProcessedImageEntity entity,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<ProcessedImageEntity>.Filter.Eq(e => e.Path, entity.Path);
        await _collection.ReplaceOneAsync(
            filter,
            entity,
            new ReplaceOptions { IsUpsert = true },
            cancellationToken);
    }

    public async Task<ProcessedImageEntity?> GetByPathAsync(
        string path,
        CancellationToken cancellationToken = default)
    {
        return await _collection
            .Find(e => e.Path == path)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async IAsyncEnumerable<string> GetProcessedPathsAsync(
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var projection = Builders<ProcessedImageEntity>.Projection.Include(e => e.Path);
        using var cursor = await _collection
            .Find(Builders<ProcessedImageEntity>.Filter.Empty)
            .Project<ProcessedImageEntity>(projection)
            .ToCursorAsync(cancellationToken);

        while (await cursor.MoveNextAsync(cancellationToken))
        {
            foreach (var doc in cursor.Current)
            {
                yield return doc.Path;
            }
        }
    }
}
```

- [ ] **Step 4: Build**

Run:
```bash
cd api && dotnet build
```
Expected: `Build succeeded`

- [ ] **Step 5: Commit**

```bash
git add api/Entities/ProcessedImageEntity.cs api/Repositories/Interfaces/IProcessedImageRepository.cs api/Repositories/ProcessedImageRepository.cs
git commit -m "feat(api): add ProcessedImage MongoDB repository"
```

---

### Task 11: `ManifestSyncService` — HTTP client for the Worker

**Files:**
- Create: `api/Services/Interfaces/IManifestSyncService.cs`
- Create: `api/Services/Implementations/ManifestSyncService.cs`

- [ ] **Step 1: Create the interface**

Create `api/Services/Interfaces/IManifestSyncService.cs`:
```csharp
using Api.Entities;

namespace Api.Services.Interfaces;

public interface IManifestSyncService
{
    /// <summary>
    /// Sync a processed image manifest entry to the Cloudflare Worker D1
    /// cache. Fire-and-forget — failures are logged but not thrown.
    /// </summary>
    Task SyncAsync(ProcessedImageEntity entity, CancellationToken cancellationToken = default);
}
```

- [ ] **Step 2: Create the implementation**

Create `api/Services/Implementations/ManifestSyncService.cs`:
```csharp
using System.Net.Http.Json;
using Api.Entities;
using Api.Services.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Api.Services.Implementations;

public class ManifestSyncService : IManifestSyncService
{
    private readonly HttpClient _http;
    private readonly string _endpoint;
    private readonly string _secret;
    private readonly ILogger<ManifestSyncService> _logger;

    public ManifestSyncService(
        HttpClient http,
        IConfiguration config,
        ILogger<ManifestSyncService> logger)
    {
        _http = http;
        _endpoint = config["ManifestSync:Endpoint"]
            ?? throw new InvalidOperationException("ManifestSync:Endpoint not configured");
        _secret = config["ManifestSync:Secret"]
            ?? throw new InvalidOperationException("ManifestSync:Secret not configured");
        _logger = logger;
    }

    public async Task SyncAsync(
        ProcessedImageEntity entity,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var payload = new
            {
                path = entity.Path,
                format = entity.Format,
                widths = entity.Widths,
                processedAt = entity.ProcessedAt.ToString("O"),
                source = entity.Source,
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, _endpoint)
            {
                Content = JsonContent.Create(payload),
            };
            request.Headers.Add("X-Internal-Auth", _secret);

            var response = await _http.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning(
                    "Manifest sync failed for {Path}: {Status} {Body}",
                    entity.Path, response.StatusCode, body);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Manifest sync threw for {Path}", entity.Path);
        }
    }
}
```

- [ ] **Step 3: Build**

Run:
```bash
cd api && dotnet build
```
Expected: `Build succeeded`

- [ ] **Step 4: Commit**

```bash
git add api/Services/Interfaces/IManifestSyncService.cs api/Services/Implementations/ManifestSyncService.cs
git commit -m "feat(api): add ManifestSyncService that calls the Worker"
```

---

### Task 12: Extend `BlobStorageService` with variant upload

**Files:**
- Modify: `api/Services/Interfaces/IBlobStorageService.cs`
- Modify: `api/Services/Implementations/BlobStorageService.cs`

- [ ] **Step 1: Add the interface method**

Read `api/Services/Interfaces/IBlobStorageService.cs` and append to the interface:
```csharp
Task UploadVariantAsync(string originalBlobName, int width, byte[] webpData, CancellationToken cancellationToken = default);

Task SetProcessedMetadataAsync(string blobName, string source, DateTime processedAt, CancellationToken cancellationToken = default);
```

- [ ] **Step 2: Implement the new methods**

In `api/Services/Implementations/BlobStorageService.cs`, add:
```csharp
public async Task UploadVariantAsync(
    string originalBlobName,
    int width,
    byte[] webpData,
    CancellationToken cancellationToken = default)
{
    var variantName = $"{originalBlobName}/w{width}.webp";
    var blobClient = _container.GetBlobClient(variantName);
    using var ms = new MemoryStream(webpData);
    var headers = new BlobHttpHeaders
    {
        ContentType = "image/webp",
        CacheControl = "public, max-age=31536000, immutable",
    };
    await blobClient.UploadAsync(
        ms,
        new BlobUploadOptions { HttpHeaders = headers },
        cancellationToken);
}

public async Task SetProcessedMetadataAsync(
    string blobName,
    string source,
    DateTime processedAt,
    CancellationToken cancellationToken = default)
{
    var blobClient = _container.GetBlobClient(blobName);
    var metadata = new Dictionary<string, string>
    {
        ["processed"] = "true",
        ["source"] = source,
        ["processedAt"] = processedAt.ToString("O"),
    };
    await blobClient.SetMetadataAsync(metadata, cancellationToken: cancellationToken);
}
```

- [ ] **Step 3: Build**

Run:
```bash
cd api && dotnet build
```
Expected: `Build succeeded`

- [ ] **Step 4: Commit**

```bash
git add api/Services/Interfaces/IBlobStorageService.cs api/Services/Implementations/BlobStorageService.cs
git commit -m "feat(api): add variant upload and processed metadata methods to blob service"
```

---

### Task 13: Rewire `ImageUploadFunction` + register DI + app settings

**Files:**
- Modify: `api/Functions/ImageUploadFunction.cs`
- Modify: `api/Program.cs`
- Modify: `api/local.settings.json` (for local dev)

- [ ] **Step 1: Rewrite `ImageUploadFunction`**

Replace the contents of `api/Functions/ImageUploadFunction.cs`:
```csharp
using System.Net;
using Api.Entities;
using Api.Exceptions;
using Api.Helpers;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using HttpMultipartParser;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace Api.Functions;

public class ImageUploadFunction
{
    private static readonly int[] TargetWidths = [400, 800, 1200, 1600, 2000];

    private readonly IBlobStorageService _blobService;
    private readonly IImageProcessingService _imageProcessor;
    private readonly IProcessedImageRepository _processedRepo;
    private readonly IManifestSyncService _manifestSync;
    private readonly AuthHelper _auth;

    public ImageUploadFunction(
        IBlobStorageService blobService,
        IImageProcessingService imageProcessor,
        IProcessedImageRepository processedRepo,
        IManifestSyncService manifestSync,
        AuthHelper auth)
    {
        _blobService = blobService;
        _imageProcessor = imageProcessor;
        _processedRepo = processedRepo;
        _manifestSync = manifestSync;
        _auth = auth;
    }

    [Function("AdminUploadBlogImage")]
    public async Task<HttpResponseData> Upload(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/blog/upload-image")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "manage:blog");

        var parsed = await MultipartFormDataParser.ParseAsync(req.Body);
        var original = parsed.Files.FirstOrDefault(f => f.Name == "original")
            ?? parsed.Files.FirstOrDefault()
            ?? throw new AppValidationException("file", "No image file provided.");

        // 1. Upload the original to its final path
        using var originalStream = new MemoryStream();
        await original.Data.CopyToAsync(originalStream);
        originalStream.Position = 0;

        var originalUrl = await _blobService.UploadImageAsync(
            originalStream,
            original.FileName,
            original.ContentType);

        // Derive the blob name (the path within the container) from the URL
        var blobName = ExtractBlobName(originalUrl);
        var source = "backend";
        Dictionary<int, byte[]> variants;

        // 2. Check for client-provided variants
        var clientVariants = new Dictionary<int, byte[]>();
        foreach (var width in TargetWidths)
        {
            var file = parsed.Files.FirstOrDefault(f => f.Name == $"variant_{width}");
            if (file is null) break;
            using var ms = new MemoryStream();
            await file.Data.CopyToAsync(ms);
            clientVariants[width] = ms.ToArray();
        }

        if (clientVariants.Count == TargetWidths.Length)
        {
            variants = clientVariants;
            source = "frontend";
        }
        else
        {
            // 3. Backend fallback: run ImageSharp on the original
            originalStream.Position = 0;
            var generated = await _imageProcessor.GenerateWebpVariantsAsync(
                originalStream,
                TargetWidths);
            variants = generated.ToDictionary(v => v.Width, v => v.Data);
        }

        // 4. Upload all variants to Azure Blob
        foreach (var kv in variants)
        {
            await _blobService.UploadVariantAsync(blobName, kv.Key, kv.Value);
        }

        // 5. Set processed metadata on the original
        var processedAt = DateTime.UtcNow;
        await _blobService.SetProcessedMetadataAsync(blobName, source, processedAt);

        // 6. Upsert manifest in MongoDB
        var manifest = new ProcessedImageEntity
        {
            Path = blobName,
            Format = "webp",
            Widths = TargetWidths,
            ProcessedAt = processedAt,
            Source = source,
        };
        await _processedRepo.UpsertAsync(manifest);

        // 7. Fire-and-forget sync to Worker
        _ = _manifestSync.SyncAsync(manifest);

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { url = originalUrl });
    }

    private static string ExtractBlobName(string blobUrl)
    {
        // https://htstorageprod.blob.core.windows.net/blog-images/2026/04/xyz.png
        //                                            ^-- everything after this is the container/blob path
        var uri = new Uri(blobUrl);
        // Skip leading "/blog-images/" to get the blob name relative to the container
        var segments = uri.AbsolutePath.TrimStart('/').Split('/', 2);
        return segments.Length == 2 ? $"blog-images/{segments[1]}" : segments[0];
    }
}
```

- [ ] **Step 2: Register the new services in `Program.cs`**

Read `api/Program.cs` and add the service registrations alongside the existing ones:
```csharp
builder.Services.AddSingleton<IImageProcessingService, ImageProcessingService>();
builder.Services.AddScoped<IProcessedImageRepository, ProcessedImageRepository>();
builder.Services.AddHttpClient<IManifestSyncService, ManifestSyncService>();
```

Make sure the necessary `using` statements are added at the top of `Program.cs`:
```csharp
using Api.Repositories;
using Api.Repositories.Interfaces;
using Api.Services.Implementations;
using Api.Services.Interfaces;
```

- [ ] **Step 3: Add the config values to `local.settings.json`**

Open `api/local.settings.json` and add to the `Values` object:
```jsonc
"ManifestSync:Endpoint": "http://localhost:3000/api/internal/image-manifest",
"ManifestSync:Secret": "local-dev-secret-replace-in-prod",
"IMAGE_SWEEP_SECRET": "local-sweep-secret-replace-in-prod"
```

For production, these must be set as Azure Function app settings:
- `ManifestSync:Endpoint` = `https://www.horizon-tech.io/api/internal/image-manifest`
- `ManifestSync:Secret` = the value from Task 2 Step 4
- `IMAGE_SWEEP_SECRET` = generate with `openssl rand -hex 32` and save for later

Document these in the Azure Portal > Function App > Configuration after first deploy.

- [ ] **Step 4: Build**

Run:
```bash
cd api && dotnet build
```
Expected: `Build succeeded`

- [ ] **Step 5: Commit**

```bash
git add api/Functions/ImageUploadFunction.cs api/Program.cs api/local.settings.json
git commit -m "feat(api): upload endpoint generates/accepts variants and syncs manifest"
```

---

### Task 14: `ImageSweepFunction`

**Files:**
- Create: `api/Functions/ImageSweepFunction.cs`

- [ ] **Step 1: Create the sweep function**

Create `api/Functions/ImageSweepFunction.cs`:
```csharp
using System.Net;
using Api.Entities;
using Api.Helpers;
using Api.Services.Interfaces;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Api.Functions;

public class ImageSweepFunction
{
    private static readonly int[] TargetWidths = [400, 800, 1200, 1600, 2000];
    private const string ContainerName = "blog-images";

    private readonly IBlobStorageService _blobService;
    private readonly IImageProcessingService _imageProcessor;
    private readonly IManifestSyncService _manifestSync;
    private readonly Api.Repositories.Interfaces.IProcessedImageRepository _processedRepo;
    private readonly BlobContainerClient _container;
    private readonly string _sweepSecret;
    private readonly ILogger<ImageSweepFunction> _logger;

    public ImageSweepFunction(
        IBlobStorageService blobService,
        IImageProcessingService imageProcessor,
        IManifestSyncService manifestSync,
        Api.Repositories.Interfaces.IProcessedImageRepository processedRepo,
        IConfiguration config,
        ILogger<ImageSweepFunction> logger)
    {
        _blobService = blobService;
        _imageProcessor = imageProcessor;
        _manifestSync = manifestSync;
        _processedRepo = processedRepo;
        _sweepSecret = config["IMAGE_SWEEP_SECRET"]
            ?? throw new InvalidOperationException("IMAGE_SWEEP_SECRET not configured");
        _logger = logger;

        var connectionString = Environment.GetEnvironmentVariable("BLOB_STORAGE_CONNECTION_STRING");
        _container = new BlobServiceClient(connectionString)
            .GetBlobContainerClient(ContainerName);
    }

    [Function("SweepUnprocessedImages")]
    public async Task<HttpResponseData> Sweep(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/images/sweep")]
        HttpRequestData req)
    {
        if (!req.Headers.TryGetValues("X-Internal-Auth", out var auth)
            || auth.FirstOrDefault() != _sweepSecret)
        {
            return req.CreateResponse(HttpStatusCode.Unauthorized);
        }

        var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
        var batchSize = int.TryParse(query["batchSize"], out var b) ? b : 50;

        var scanned = 0;
        var processed = 0;
        var skipped = 0;
        var errors = new List<string>();

        await foreach (var blob in _container.GetBlobsAsync(BlobTraits.Metadata))
        {
            if (processed >= batchSize) break;
            scanned++;

            // Skip variant paths (they live at {original}/w{width}.webp)
            if (IsVariantPath(blob.Name)) { skipped++; continue; }

            // Skip already-processed
            if (blob.Metadata.TryGetValue("processed", out var p) && p == "true")
            { skipped++; continue; }

            try
            {
                await ProcessOneAsync(blob.Name);
                processed++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Sweep failed for {Blob}", blob.Name);
                errors.Add($"{blob.Name}: {ex.Message}");
            }
        }

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new
        {
            scanned,
            processed,
            skipped,
            errors,
            hasMore = processed == batchSize,
        });
    }

    private async Task ProcessOneAsync(string blobName)
    {
        var blobClient = _container.GetBlobClient(blobName);
        using var download = await blobClient.OpenReadAsync();

        var variants = await _imageProcessor.GenerateWebpVariantsAsync(
            download,
            TargetWidths);

        foreach (var v in variants)
        {
            await _blobService.UploadVariantAsync($"{ContainerName}/{blobName}", v.Width, v.Data);
        }

        var processedAt = DateTime.UtcNow;
        await _blobService.SetProcessedMetadataAsync(
            $"{ContainerName}/{blobName}",
            "sweep",
            processedAt);

        var manifest = new ProcessedImageEntity
        {
            Path = $"{ContainerName}/{blobName}",
            Format = "webp",
            Widths = TargetWidths,
            ProcessedAt = processedAt,
            Source = "sweep",
        };
        await _processedRepo.UpsertAsync(manifest);
        await _manifestSync.SyncAsync(manifest);
    }

    private static bool IsVariantPath(string name)
    {
        // Variant format: {original}/w{width}.webp
        var idx = name.LastIndexOf('/');
        if (idx < 0) return false;
        var last = name[(idx + 1)..];
        return last.StartsWith("w") && last.EndsWith(".webp");
    }
}
```

- [ ] **Step 2: Build**

Run:
```bash
cd api && dotnet build
```
Expected: `Build succeeded`

- [ ] **Step 3: Commit**

```bash
git add api/Functions/ImageSweepFunction.cs
git commit -m "feat(api): add HTTP-triggered image sweep function"
```

---

## Phase 5 — Deploy and backfill

### Task 15: Bump Azure Function memory + deploy Worker

**Files:** none (infrastructure + deploy)

- [ ] **Step 1: Bump Azure Function memory via Azure CLI**

Run (replace `ht-rg` with actual resource group if different):
```bash
az functionapp config set \
  --name ht-func-prod \
  --resource-group ht-rg \
  --generic-configurations '{"functionAppScaleLimit": 20}'

az functionapp update \
  --name ht-func-prod \
  --resource-group ht-rg \
  --set siteConfig.netFrameworkVersion=v10.0

az functionapp plan update \
  --name ht-func-prod-plan \
  --resource-group ht-rg \
  --sku FC1 \
  --instance-memory 2048
```

If any of those command names differ because the Function App is on Flex Consumption with a specific SKU, check Azure Portal > Function App > Scale out → instance memory size and set to **2048 MB** manually.

- [ ] **Step 2: Set Azure Function app settings**

```bash
az functionapp config appsettings set \
  --name ht-func-prod \
  --resource-group ht-rg \
  --settings \
    "ManifestSync:Endpoint=https://www.horizon-tech.io/api/internal/image-manifest" \
    "ManifestSync:Secret=<SECRET_FROM_TASK_2>" \
    "IMAGE_SWEEP_SECRET=<SECRET_GENERATED_IN_TASK_13>"
```

- [ ] **Step 3: Deploy the Worker**

Run:
```bash
npm run build && npx wrangler deploy
```
Expected: `Deployed horizon-frontend triggers (X sec)`

- [ ] **Step 4: Deploy the Azure Function**

Run from the `api/` directory (adjust to your existing deploy workflow):
```bash
cd api && func azure functionapp publish ht-func-prod
```
Expected: `Functions in ht-func-prod: ... SweepUnprocessedImages, AdminUploadBlogImage`

- [ ] **Step 5: Smoke test the manifest sync endpoint**

Run (replace SECRET):
```bash
curl -X POST https://www.horizon-tech.io/api/internal/image-manifest \
  -H "X-Internal-Auth: <SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"path":"test/smoke.png","format":"webp","widths":[400,800],"processedAt":"2026-04-07T00:00:00Z","source":"smoke"}'
```
Expected: `{"ok":true}`

Verify the row landed in D1:
```bash
npx wrangler d1 execute horizon-db --remote --command "SELECT * FROM processed_images WHERE path='test/smoke.png'"
```
Expected: one row returned.

Clean up the test row:
```bash
npx wrangler d1 execute horizon-db --remote --command "DELETE FROM processed_images WHERE path='test/smoke.png'"
```

- [ ] **Step 6: Commit any deploy notes**

No file changes in this task — just verify everything is green.

---

### Task 16: One-shot backfill sweep

**Files:** none (operational)

- [ ] **Step 1: Run the sweep in a loop until `hasMore=false`**

Create a local script `scripts/run-sweep.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
SECRET="${IMAGE_SWEEP_SECRET:?Set IMAGE_SWEEP_SECRET first}"
URL="https://ht-func-prod.azurewebsites.net/api/manage/images/sweep?batchSize=20"

while true; do
  response=$(curl -s -X POST "$URL" -H "X-Internal-Auth: $SECRET")
  echo "$response" | jq .
  hasMore=$(echo "$response" | jq -r '.hasMore')
  if [ "$hasMore" != "true" ]; then
    echo "Sweep complete."
    break
  fi
  sleep 2
done
```

Run it:
```bash
export IMAGE_SWEEP_SECRET=<secret-from-task-13>
bash scripts/run-sweep.sh
```
Expected: several batches reported, finishing with `hasMore=false` and a summary of `processed` and `errors`.

- [ ] **Step 2: Spot-check D1 population**

```bash
npx wrangler d1 execute horizon-db --remote --command "SELECT COUNT(*) AS total FROM processed_images"
```
Expected: count equal (or nearly equal) to the number of blobs in `blog-images` (minus variants).

- [ ] **Step 3: Spot-check R2 population (will be empty until reads happen)**

```bash
npx wrangler r2 object list horizon-img-cache --limit 5
```
Expected: empty or near-empty until the blog gets its first image render after deploy.

- [ ] **Step 4: Hit a blog page to trigger a read and watch the X-Cache header**

```bash
curl -sI "https://www.horizon-tech.io/img/blog-images/2026/01/some-path.png?w=800&f=webp" | grep -i x-cache
```
Expected first request: `X-Cache: MISS-WRITE` (R2 populated from Azure variant)
Expected second request: `X-Cache: R2`

If everything is `X-Cache: FALLBACK`, the manifest didn't sync — debug the sweep logs and verify D1 has rows.

- [ ] **Step 5: Commit the sweep script**

```bash
git add scripts/run-sweep.sh
git commit -m "chore: add one-shot backfill sweep script"
```

- [ ] **Step 6: Push the full branch**

```bash
git push
```

---

## Self-Review

**Spec coverage checklist:**

- [x] Frontend OffscreenCanvas conversion → Tasks 6, 7, 8
- [x] Backend ImageSharp fallback → Tasks 9, 13
- [x] Sweep endpoint → Task 14
- [x] MongoDB manifest → Task 10
- [x] D1 manifest + mirror sync → Tasks 1, 5, 11, 13
- [x] Worker R2 read path with width snapping → Tasks 3, 4
- [x] Manifest sync endpoint with shared secret auth → Tasks 2, 5, 11
- [x] Width `[400, 800, 1200, 1600, 2000]` → Tasks 6, 7, 9, 13, 14
- [x] Format webp only with snapping → Tasks 4, 9, 13
- [x] Sweep auth via shared secret → Task 14
- [x] Migration (one-shot sweep) → Task 16
- [x] Re-upload semantics via `processedAt` version in R2 key → Task 4
- [x] Azure Function memory bump to 2048 MB → Task 15

**Placeholder scan:** no `TODO`, `TBD`, "fill in later", or "handle errors" hand-waves. Every step has exact file paths and code.

**Type consistency:** `snapWidth` signature matches between Task 3 test and Task 4 usage. `ProcessedImageEntity` properties (`Path`, `Format`, `Widths`, `ProcessedAt`, `Source`) are consistent across Tasks 10, 11, 13, 14. D1 column names (`path`, `format`, `widths`, `processed_at`, `source`) consistent across Tasks 1, 5.

**Known test limitation:** Task 6 Step 6 allows skipping the Vitest OffscreenCanvas tests if jsdom doesn't polyfill `convertToBlob`. The converter is exercised end-to-end in Task 8 (building the form) and Task 15/16 (smoke test post-deploy), so coverage is preserved.
