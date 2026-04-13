# Image Pipeline with R2 Cache — Design

**Status:** Draft for review
**Date:** 2026-04-07
**Author:** Hamza + Claude

## Problem

Every blog image render today goes through:

1. Browser → `/img/{path}?w=800&f=webp` on the CF Worker
2. Worker calls `fetch(AzureBlobUrl, { cf: { image: { width, format, quality } } })` — CF Image Resizing transforms on the fly
3. Edge cache stores the result until eviction

This works but has three problems:

- **Cold requests pay Azure egress** every time (~$0.087/GB out of Azure), with a full cross-ocean round-trip
- **CF Image Resizing is billed** at ~$1 per 100k requests, which grows linearly with cold cache misses
- **No pre-warming** — the first user in every region pays the latency penalty

## Goal

Build a three-tier image conversion pipeline where variants are generated upfront
and cached in R2 (free egress, edge-local), while keeping Azure Blob as the
primary source of truth and CF Image Resizing as a last-resort fallback.

The system must:

1. Convert on upload, not on render
2. Have three independent conversion layers so any single failure is
   transparently handled by the next
3. Keep Azure as the write path for originals and variants (Azure is primary)
4. Use R2 as a fast pull-through cache populated by the CF Worker
5. Track processed images in a manifest that lives in both MongoDB (primary)
   and D1 (edge cache for fast lookup)

## Optimization targets

This pipeline is tuned for three axes, in priority order:

1. **Core Web Vitals / SEO.** LCP is a direct ranking signal in Google Search.
   Pre-generated webp variants + aggressive edge caching + width snapping
   eliminate resize latency on cold requests, so the first paint of a hero
   image is as fast as R2 can serve it (~10ms from any edge POP).
2. **Bandwidth and compute cost.** Every cache miss today costs Azure egress
   (~$0.087/GB) plus a CF Image Resizing call (~$10/million). After this
   pipeline, both drop to near-zero: variants live in R2 (free egress) and
   are served directly without resizing. The only paid operation is the
   one-time PUT during conversion.
3. **Simplicity.** Five widths × one format = five files per image. No AVIF,
   no format negotiation on the hot path, no DPR detection, no `<picture>`
   element complexity. Future phases can add these if measurements justify
   them.

**Chosen parameters:**

- **Widths:** `[400, 800, 1200, 1600, 2000]`. Covers mobile (400-800),
  tablet (800-1200), desktop (1200-1600), and retina desktop (2000). The
  2000 addition over the original 1600 max is near-free on storage and
  prevents CSS upscaling on 2x displays — a measurable LCP/quality gain
  for hero images.
- **Format:** `webp` only. q=82 via libwebp. Universal support in our
  target browsers (98%+). AVIF is explicitly deferred — the jpeg→webp
  gain is ~30%, the webp→avif gain is only ~15-20%, and AVIF encoding
  doubles the pipeline's complexity (both in the browser OffscreenCanvas
  worker and in ImageSharp).
- **Cache headers:** `Cache-Control: public, max-age=31536000, immutable`
  on every `/img/*` response. The version component in the R2 key
  (`-v{epoch}`) invalidates on re-processing, so the immutable header is
  safe.

## Non-goals

- On-demand custom transforms (arbitrary width/quality from client). The pipeline
  pre-generates a fixed matrix of 4 widths × 1 format (webp). Ad-hoc variants
  still work via the CF Image Resizing fallback for images without a manifest,
  but this is a rare slow path.
- Replacing Azure Blob with R2 as the primary store. Azure remains the source
  of truth for originals AND variants; R2 is a cache only.
- Migrating away from the existing `/img/` URL scheme. Frontend code stays
  unchanged; only the Worker's handler gets smarter.
- **User avatars.** Avatars come from a separate profile upload flow and use a
  different width set (`[48, 96, 192]`). They can be addressed in a follow-up
  spec. This design covers `blog-images/*` only.
- **AVIF output.** The pipeline generates webp only. The `f=avif` query param
  is still honored via CF Image Resizing for images without a manifest, but
  manifested images always serve webp regardless of the requested format.

## Architecture

### High-level flow

```
Admin Upload (Frontend)
    |
    v
[1. Frontend conversion in OffscreenCanvas worker]
    |
    +-- success --> uploads original + 4 webp variants to Azure Function
    |                                                         |
    |                                                         v
    +-- fail ------> uploads only original to Azure Function  |
                                                              |
                                                              v
                                         [2. Azure Function: if no variants
                                             provided, run ImageSharp]
                                                              |
                                                              v
                                              Azure Blob (original + variants)
                                                              |
                                                              v
                                              MongoDB: upsert ProcessedImage
                                                              |
                                                              v
                                              POST /api/internal/image-manifest
                                                              |
                                                              v
                                                   CF Worker: upsert D1
```

```
Read Path (public)
    |
    v
Browser --> /img/{path}?w=750&f=webp
    |
    v
CF Worker:
    1. edge cache hit?                                        -> serve
    2. D1 processed_images row for path?
         - hit:   SNAP w=750 to available widths             -> snapped=800
                  R2 has {path}/w800-v{ts}.webp?
                    - hit:  serve from R2 + edge cache
                    - miss: fetch Azure variant {path}/w800.webp
                            -> serve + tee to R2 + edge cache
         - miss:  fetch Azure original + CF Image Resizing   -> serve + edge cache
```

Width snapping means a manifested image **never** hits CF Image Resizing even
when the requested `w` doesn't exactly match a pre-generated variant.

### Layer 1 — Frontend conversion (primary path)

**Location:** `src/lib/image-convert.ts` (new) invoked from `ImageCropUpload.tsx`

**Behavior:**

1. User picks an image in the admin UI
2. Spawn a Web Worker that runs:
   - `createImageBitmap(file)` to decode
   - For each target width `[400, 800, 1200, 1600, 2000]`:
     - Compute proportional height
     - Draw onto an `OffscreenCanvas`
     - `canvas.convertToBlob({ type: 'image/webp', quality: 0.82 })`
   - Post the resulting 4 Blobs back to the main thread
3. Build a `multipart/form-data` with fields:
   - `original` — the untouched source file
   - `variant_400`, `variant_800`, `variant_1200`, `variant_1600` — the webp blobs
4. POST to `/api/manage/blog/upload-image` (existing endpoint, enhanced)
5. On worker crash / OOM / unsupported format: fall back to uploading just the
   `original` field. Backend will handle conversion.

**Why native canvas over libraries:**

- `canvas.toBlob('image/webp')` already delegates to Chromium's libwebp — same
  encoder the backend would use. q=0.82 is production-grade for blog covers.
- Zero bundle cost. No `@squoosh/lib`, no `browser-image-compression`.
- OffscreenCanvas + Worker keeps the UI thread free during resize.

**Bundle impact:** 0 KB (native APIs, no new dependencies)

### Layer 2 — Backend Azure Function (fallback path)

**Location:** `api/Functions/ImageUploadFunction.cs` (modify existing endpoint)
`api/Services/Implementations/ImageProcessingService.cs` (new)

**Behavior:**

1. Receive multipart upload at `POST /manage/blog/upload-image`
2. Parse form fields:
   - If `variant_400..variant_1600` are all present → use them directly
   - Otherwise → load `original` with `SixLabors.ImageSharp.Image.LoadAsync`
     and encode 4 webp variants server-side:

   ```csharp
   foreach (var w in new[] { 400, 800, 1200, 1600 })
   {
       using var clone = src.Clone(ctx => ctx.Resize(new ResizeOptions
       {
           Size = new Size(w, 0),
           Mode = ResizeMode.Max,
           Sampler = KnownResamplers.Lanczos3
       }));
       using var ms = new MemoryStream();
       await clone.SaveAsWebpAsync(ms, new WebpEncoder { Quality = 82 });
       variants[w] = ms.ToArray();
   }
   ```

3. Upload original to Azure Blob at `blog-images/{yyyy/MM}/{GUID}-{filename}`
4. Upload each variant to `blog-images/{yyyy/MM}/{GUID}-{filename}/w{w}.webp`
5. Set source blob metadata: `processed=true`, `processedAt={iso}`,
   `source={frontend|backend}`
6. Upsert `ProcessedImageEntity` into MongoDB
7. Fire-and-forget POST to Worker endpoint to sync D1 (see Layer 3)
8. Return `{ url, variants: { 400: "...", 800: "...", ... } }` to the client

**NuGet additions:**
- `SixLabors.ImageSharp` (Six Labors Split License — free for Horizon's use)
- `AWSSDK.S3` (only — for R2 uploads if needed later; not used in this phase)

**Memory note:** Bump Azure Functions Flex instance size to **2048 MB** to
handle decoding of large originals (10 MB+ jpg can peak at 300 MB working set
during decode).

### Layer 3 — Sweep endpoint (catch-up path)

**Location:** `api/Functions/ImageSweepFunction.cs` (new)

**Behavior:**

Plain HTTP trigger — not Durable Functions. Durable adds operational complexity
for this workload and Flex Consumption support is limited.

**Endpoint:** `POST /manage/images/sweep?batchSize=50`

**Auth:** Shared secret in `X-Internal-Auth` header. Stored as Azure Function
app setting `IMAGE_SWEEP_SECRET`. No admin JWT required, so the endpoint can be
triggered by cron, CI, or the admin UI (which would read the secret from a
secured config endpoint or proxy through an admin-JWT-protected endpoint).

**Flow:**

```csharp
public async Task<HttpResponseData> Sweep(
    [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/images/sweep")]
    HttpRequestData req)
{
    // Validate shared secret
    if (req.Headers.GetValue("X-Internal-Auth") != _config["IMAGE_SWEEP_SECRET"])
        return await req.CreateResponseAsync(Unauthorized);

    var batchSize = int.TryParse(req.Query["batchSize"], out var b) ? b : 50;

    var container = _blobClient.GetContainerReference("blog-images");
    var scanned = 0; var processed = 0; var skipped = 0;
    var errors = new List<string>();

    await foreach (var blob in container.GetBlobsAsync(
        BlobTraits.Metadata, BlobStates.None, prefix: ""))
    {
        if (processed >= batchSize) break;
        scanned++;

        // Skip variants themselves (w400.webp etc)
        if (IsVariantPath(blob.Name)) { skipped++; continue; }

        // Skip already processed
        if (blob.Metadata.TryGetValue("processed", out var p) && p == "true")
        { skipped++; continue; }

        try
        {
            await ProcessImageAsync(blob.Name);
            processed++;
        }
        catch (Exception ex)
        {
            errors.Add($"{blob.Name}: {ex.Message}");
        }
    }

    return await req.CreateJsonResponseAsync(OK, new {
        scanned, processed, skipped, errors, hasMore = processed == batchSize
    });
}
```

The caller can poll `hasMore=true` until `false` to complete a full backfill.

### Manifest schema

**MongoDB** (`processed_images` collection):

```csharp
public class ProcessedImageEntity
{
    [BsonId]
    public string Path { get; set; }              // "blog-images/2026/04/abc123-photo.png"
    public string Format { get; set; } = "webp";
    public int[] Widths { get; set; } = [400, 800, 1200, 1600, 2000];
    public DateTime ProcessedAt { get; set; }
    public string Source { get; set; }             // "frontend" | "backend" | "sweep"
}
```

**D1** (`processed_images` table) — added to `src/server/db/schema.ts`:

```ts
export const processedImages = sqliteTable('processed_images', {
  path: text('path').primaryKey(),
  format: text('format').notNull().default('webp'),
  widths: text('widths').notNull(),              // JSON array
  processedAt: text('processed_at').notNull(),   // ISO string
  source: text('source').notNull(),
})
```

### R2 cache integration

**Bucket setup:**

```jsonc
// wrangler.jsonc
"r2_buckets": [
  { "binding": "IMG_CACHE", "bucket_name": "horizon-img-cache" }
]
```

One-time: `npx wrangler r2 bucket create horizon-img-cache`

**Object key convention:**

```
{original_path}/w{width}-v{processed_at_epoch}.webp
e.g. blog-images/2026/04/abc123-photo.png/w800-v1712500000.webp
```

The `-v{epoch}` suffix is the **versioning strategy**: when an image is
re-processed (new `processedAt` in the manifest), the Worker computes a new R2
key and old R2 objects become orphaned but harmless. Orphans get cleaned by an
optional future TTL sweep; in practice R2 free tier (10 GB) absorbs the waste.

**Width snapping rule:** when the manifest exists, the Worker never calls CF
Image Resizing. Instead it snaps the requested width to the nearest
pre-generated variant:

- Requested `w` is rounded **up** to the smallest available width that is
  `>= w`
- If `w` is larger than the biggest available (e.g., `w=2400` on a 1600-max
  image), clamp to the largest variant. The browser upscales via CSS.
- The extra bytes from rounding up (e.g., serving 800px for a 750px request)
  are far cheaper than a CF Image Resizing call.

**Format snapping:** if the manifest exists, the Worker always serves webp.
The `f` query param is ignored for manifested images. Only images without a
manifest still honor `f` via the CF Image Resizing fallback.

**Worker handler** — replace the existing `/img/*` route in `src/server.ts`:

```ts
app.get('/img/*', async (c) => {
  const blobPath = c.req.path.slice(5)
  const url = new URL(c.req.url)
  const w = parseInt(url.searchParams.get('w') ?? '0', 10)
  const q = url.searchParams.get('q') ?? '80'
  const f = url.searchParams.get('f') ?? 'webp'

  // 1. Edge cache
  const cache = caches.default
  const cacheKey = new Request(c.req.url)
  const cached = await cache.match(cacheKey)
  if (cached) return cached

  // 2. D1 manifest lookup → authoritative variant matrix + version
  const manifest = await c.env.DB.prepare(
    'SELECT processed_at, widths FROM processed_images WHERE path = ?'
  ).bind(blobPath).first<{ processed_at: string; widths: string }>()

  if (manifest && w > 0) {
    const available = JSON.parse(manifest.widths) as number[]
    // Snap: round up to nearest available, clamp to max
    const snapped = available.find(v => v >= w) ?? available[available.length - 1]
    const version = Math.floor(new Date(manifest.processed_at).getTime() / 1000)
    const r2Key = `${blobPath}/w${snapped}-v${version}.webp`

    // 3a. R2 check
    const r2Object = await c.env.IMG_CACHE.get(r2Key)
    if (r2Object) {
      return serveR2Object(r2Object, cache, cacheKey, c.executionCtx)
    }

    // 3b. Azure variant (guaranteed to exist — manifest is authoritative)
    const azureVariantUrl = `${AZURE_BLOB_ORIGIN}/${blobPath}/w${snapped}.webp`
    const upstream = await fetch(azureVariantUrl)
    if (upstream.ok) {
      return teeToR2AndServe(upstream, r2Key, c.env.IMG_CACHE, cache, cacheKey, c.executionCtx)
    }
    // Azure variant missing despite manifest → log and fall through to resize
    console.error(`[img] manifest hit but Azure variant missing: ${azureVariantUrl}`)
  }

  // 4. Fallback: no manifest → original + CF Image Resizing
  const fetchOpts: RequestInit & { cf?: any } = w > 0
    ? { cf: { image: { width: w, quality: +q, format: f, fit: 'scale-down' } } }
    : {}
  const upstream = await fetch(`${AZURE_BLOB_ORIGIN}/${blobPath}`, fetchOpts)
  if (!upstream.ok) return c.text('Not found', 404)

  return cachedResponse(upstream, cache, cacheKey, c.executionCtx)
})
```

Helper `teeToR2AndServe` uses `body.tee()` to stream to both the client and
R2 simultaneously, with a `.catch(...)` on the R2 put so outages never break
the response. `cachedResponse` wraps the upstream with immutable cache-control
headers and puts it into `caches.default`.

### Manifest sync endpoint

**Location:** new route in `src/server.ts`:

```ts
app.post('/api/internal/image-manifest', async (c) => {
  const secret = c.req.header('X-Internal-Auth')
  if (secret !== c.env.IMAGE_SYNC_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { path, format, widths, processedAt, source } = await c.req.json()

  await c.env.DB.prepare(`
    INSERT INTO processed_images (path, format, widths, processed_at, source)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(path) DO UPDATE SET
      format = excluded.format,
      widths = excluded.widths,
      processed_at = excluded.processed_at,
      source = excluded.source
  `).bind(path, format, JSON.stringify(widths), processedAt, source).run()

  return c.json({ ok: true })
})
```

**Auth:** wrangler secret `IMAGE_SYNC_SECRET`. Set via
`npx wrangler secret put IMAGE_SYNC_SECRET`. Azure Function reads the same
value from its app settings and sends it in the `X-Internal-Auth` header on
every manifest sync call.

## Data flow summary

| Event | Write order |
|---|---|
| New upload (frontend converts) | Azure Blob → MongoDB → POST /api/internal/image-manifest → D1 |
| New upload (backend converts) | Azure Blob → MongoDB → POST /api/internal/image-manifest → D1 |
| Sweep processes old image | Azure Blob → MongoDB → POST /api/internal/image-manifest → D1 |
| Image render (edge cache hit) | edge cache → serve (0 work) |
| Image render (manifested, R2 hit) | D1 lookup → snap width → R2 get → serve (~10ms) |
| Image render (manifested, R2 miss) | D1 lookup → snap width → Azure variant fetch → serve + R2 write |
| Image render (no manifest) | D1 lookup (miss) → Azure original + CF Image Resizing → serve |

## Error handling

| Failure | Mitigation |
|---|---|
| Frontend conversion crashes | Upload only original → backend ImageSharp handles it |
| Backend ImageSharp fails | Error returned to admin, upload rejected. Original NOT saved. |
| Azure Blob upload fails | Error returned, nothing persisted |
| MongoDB insert fails | Error returned (we require the manifest to exist) |
| D1 sync call fails | Logged but not surfaced. Sweep reconciles on next run by inserting missing manifests. |
| R2 PUT fails during tee | Swallowed (`.catch`). Response still served. Next request retries R2 write. |
| D1 query fails in Worker | Treated as manifest miss → fall back to CF Image Resizing path |

## Testing

- Frontend: unit test the OffscreenCanvas worker with a fixture image, assert 4
  blobs at expected widths with mime `image/webp`
- Backend: integration test the Azure Function with:
  - Multipart containing all variants → verify no ImageSharp call
  - Multipart with only original → verify ImageSharp generates all 4 variants
  - Verify MongoDB insert + D1 sync side effects
- Sweep: test with blob container containing mix of processed/unprocessed blobs,
  assert the processed ones are skipped
- Worker: test the `/img/` handler against each branch of the read flow
  (edge cache, R2 hit, D1 hit + Azure variant, D1 miss + CF Image Resizing)

## Migration plan (one-shot sweep)

1. Deploy the Worker changes (read path, manifest sync endpoint) — backward
   compatible since D1 miss falls through to the existing CF Image Resizing path
2. Deploy the Azure Function changes (upload endpoint enhancement + sweep
   endpoint + ImageSharp dependency)
3. Set `IMAGE_SYNC_SECRET` on both Worker and Function
4. Create D1 `processed_images` table via migration
5. Run the sweep once from CI or a one-off script:
   `curl -X POST 'https://ht-func-prod.azurewebsites.net/manage/images/sweep?batchSize=50' -H 'X-Internal-Auth: {secret}'` in a loop until `hasMore=false`
6. Verify R2 fills as traffic flows
7. Monitor CF Image Resizing request count — should drop to near-zero after
   warm-up

## Open questions

None — all covered above.

## Rollback

If anything goes wrong:

1. Remove the D1 `processed_images` check from the Worker's `/img/*` handler
2. Worker falls back entirely to CF Image Resizing path (current behavior)
3. Azure variants remain in Blob Storage (harmless)
4. Manifest rows in MongoDB + D1 are harmless data

No data loss possible — the pipeline is additive.
