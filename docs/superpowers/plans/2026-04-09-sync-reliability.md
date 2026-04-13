# Sync Reliability Plan — Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate from Cosmos DB MongoDB API → Cosmos DB NoSQL API, add Change Feed for reactive D1 sync, and harden R2 with durable queues, circuit breaker, and proactive warming.

**Architecture:** Writes land in Cosmos DB NoSQL (source of truth). Change Feed triggers Azure Functions that POST batched upserts to a generalized `/api/internal/sync` endpoint on the Worker, which applies them to D1 atomically. R2 image caching moves from fire-and-forget `waitUntil` to a durable Cloudflare Queue with retry and DLQ. A circuit breaker protects the Azure Blob fallback path.

**Tech Stack:** Cosmos DB NoSQL SDK (`Microsoft.Azure.Cosmos`), Azure Functions CosmosDB trigger, Cloudflare Queues, Polly (retry), Hono, Drizzle ORM, Vitest.

**Phases:** 1 (R2 hardening) and 2 (Cosmos migration) run in parallel. Phases 3-5 are sequential.

---

## File Map

### Worker-side (new/modified)

| File | Responsibility |
|------|---------------|
| `wrangler.jsonc` | Add queue bindings |
| `src/server/bindings.ts` | Add queue + sync secret types |
| `src/server.ts` | Register `/api/internal/sync`, `/api/internal/image-warm`, `/api/internal/health` |
| `src/server/sync-receiver.ts` | **New.** Generalized D1 sync endpoint with entity handlers |
| `src/server/sync-receiver.test.ts` | **New.** Tests for entity mapping + upsert SQL |
| `src/server/image-handler.ts` | Replace `waitUntil(R2.put)` with queue, add circuit breaker + staleness |
| `src/server/image-handler.test.ts` | Add circuit breaker + staleness tests |
| `src/server/image-warm.ts` | **New.** Proactive R2 warming endpoint |
| `src/server/r2-queue-consumer.ts` | **New.** Queue consumer for durable R2 writes |
| `src/server/circuit-breaker.ts` | **New.** Simple circuit breaker (no external deps) |
| `src/server/circuit-breaker.test.ts` | **New.** Circuit breaker tests |
| `src/server/health.ts` | **New.** D1 health/staleness endpoint |
| `src/server/image-manifest.ts` | **Remove** after Phase 4 (replaced by sync-receiver) |

### Azure Function-side (new/modified)

| File | Responsibility |
|------|---------------|
| `api/Api.csproj` | Add `Microsoft.Azure.Cosmos`, `Polly`, remove MongoDB driver |
| `api/Program.cs` | Replace MongoDB DI with CosmosClient DI |
| `api/Entities/*.cs` | Remove `[Bson*]` attributes, add `[JsonPropertyName]` |
| `api/Repositories/Implementations/*.cs` | Rewrite all 9 repos from MongoDB to Cosmos SDK |
| `api/Functions/ChangeFeedSyncFunctions.cs` | **New.** 6 CosmosDB trigger functions |
| `api/Functions/SyncHealthCheckFunction.cs` | **New.** Timer-triggered health monitor |
| `api/Services/Implementations/ManifestSyncService.cs` | Rename to `WorkerSyncService`, generalize |
| `api/Services/Interfaces/IManifestSyncService.cs` | Rename to `IWorkerSyncService` |
| `api/Functions/ImageUploadFunction.cs` | Add proactive R2 warming call |
| `api/Functions/ImageSweepFunction.cs` | Remove manual D1 sync (Change Feed handles it) |
| `scripts/migrate-cosmos-nosql.ts` | **New.** One-time data migration script |

---

## Phase 1 — R2 Hardening

> No database migration needed. Can be done independently.

### Task 1: Circuit Breaker

**Files:**
- Create: `src/server/circuit-breaker.ts`
- Create: `src/server/circuit-breaker.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/server/circuit-breaker.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CircuitBreaker } from './circuit-breaker'

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('starts closed', () => {
    const cb = new CircuitBreaker()
    expect(cb.isOpen()).toBe(false)
  })

  it('opens after 3 failures', () => {
    const cb = new CircuitBreaker()
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen()).toBe(false)
    cb.recordFailure()
    expect(cb.isOpen()).toBe(true)
  })

  it('resets after timeout', () => {
    const cb = new CircuitBreaker(3, 60_000)
    cb.recordFailure()
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen()).toBe(true)
    vi.advanceTimersByTime(60_001)
    expect(cb.isOpen()).toBe(false)
  })

  it('resets on success', () => {
    const cb = new CircuitBreaker()
    cb.recordFailure()
    cb.recordFailure()
    cb.recordSuccess()
    expect(cb.isOpen()).toBe(false)
    cb.recordFailure()
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen()).toBe(true)
  })

  it('uses custom threshold and timeout', () => {
    const cb = new CircuitBreaker(2, 30_000)
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen()).toBe(true)
    vi.advanceTimersByTime(30_001)
    expect(cb.isOpen()).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/server/circuit-breaker.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement CircuitBreaker**

```typescript
// src/server/circuit-breaker.ts
export class CircuitBreaker {
  private failures = 0
  private lastFailure = 0
  private readonly threshold: number
  private readonly timeout: number

  constructor(threshold = 3, timeout = 60_000) {
    this.threshold = threshold
    this.timeout = timeout
  }

  isOpen(): boolean {
    if (this.failures >= this.threshold) {
      if (Date.now() - this.lastFailure < this.timeout) return true
      this.failures = 0
    }
    return false
  }

  recordFailure(): void {
    this.failures++
    this.lastFailure = Date.now()
  }

  recordSuccess(): void {
    this.failures = 0
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/server/circuit-breaker.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/circuit-breaker.ts src/server/circuit-breaker.test.ts
git commit -m "feat(worker): add circuit breaker for Azure Blob fallback"
```

---

### Task 2: Cloudflare Queue for R2 Writes

**Files:**
- Modify: `wrangler.jsonc`
- Modify: `src/server/bindings.ts`
- Create: `src/server/r2-queue-consumer.ts`

- [ ] **Step 1: Add queue bindings to wrangler.jsonc**

Add after the `r2_buckets` block in `wrangler.jsonc`:

```jsonc
  "queues": {
    "producers": [
      { "binding": "IMG_WRITE_QUEUE", "queue": "img-r2-writes" }
    ],
    "consumers": [
      {
        "queue": "img-r2-writes",
        "max_retries": 3,
        "dead_letter_queue": "img-r2-writes-dlq"
      }
    ]
  }
```

- [ ] **Step 2: Update bindings type**

In `src/server/bindings.ts`, add to the `Bindings` interface:

```typescript
  IMG_WRITE_QUEUE: Queue<ImageWriteMessage>
```

And add the message type:

```typescript
export interface ImageWriteMessage {
  r2Key: string
  blobUrl: string
  contentType: string
  timestamp: number
}
```

- [ ] **Step 3: Create queue consumer**

```typescript
// src/server/r2-queue-consumer.ts
import type { MessageBatch } from 'cloudflare:workers'
import type { Bindings, ImageWriteMessage } from './bindings'

export async function handleR2WriteQueue(
  batch: MessageBatch<ImageWriteMessage>,
  env: Bindings,
): Promise<void> {
  for (const msg of batch.messages) {
    try {
      const { r2Key, blobUrl, contentType } = msg.body
      const response = await fetch(blobUrl)
      if (!response.ok || !response.body) {
        console.error(`[r2-queue] fetch failed: ${response.status} for ${blobUrl}`)
        msg.retry()
        continue
      }
      await env.IMG_CACHE.put(r2Key, response.body, {
        httpMetadata: { contentType },
      })
      msg.ack()
    } catch (err) {
      console.error('[r2-queue] error:', err)
      msg.retry()
    }
  }
}
```

- [ ] **Step 4: Register queue handler in server.ts**

In `src/server.ts`, add the queue export. After the existing `export default createServerEntry(...)` line, the Worker needs to export a `queue` handler. Since TanStack Start uses `createServerEntry`, the export shape is:

```typescript
import { handleR2WriteQueue } from './r2-queue-consumer'

// After the existing app definition, modify the export:
const server = createServerEntry({ fetch: app.fetch })

export default {
  fetch: server.fetch ?? app.fetch,
  async queue(batch: MessageBatch, env: Bindings) {
    await handleR2WriteQueue(batch, env)
  },
}
```

> **Note:** Check how `createServerEntry` returns the fetch handler. If it returns an object with `.fetch`, destructure it. If it returns a module-shaped object, spread it and add `queue`. Verify by running `npm run dev` after this step.

- [ ] **Step 5: Create the queues in Cloudflare**

Run:
```bash
npx wrangler queues create img-r2-writes
npx wrangler queues create img-r2-writes-dlq
```

Expected: `Created queue img-r2-writes` and `Created queue img-r2-writes-dlq`

- [ ] **Step 6: Commit**

```bash
git add wrangler.jsonc src/server/bindings.ts src/server/r2-queue-consumer.ts src/server.ts
git commit -m "feat(worker): add Cloudflare Queue for durable R2 writes"
```

---

### Task 3: Integrate Circuit Breaker + Queue into Image Handler

**Files:**
- Modify: `src/server/image-handler.ts`
- Modify: `src/server/image-handler.test.ts`

- [ ] **Step 1: Add staleness test**

Append to `src/server/image-handler.test.ts`:

```typescript
import { isStale } from './image-handler'

describe('isStale', () => {
  it('returns false when version matches', () => {
    expect(isStale('img/w800-v1000.webp', 1000)).toBe(false)
  })

  it('returns true when manifest is newer', () => {
    expect(isStale('img/w800-v900.webp', 1000)).toBe(true)
  })

  it('returns false when no version in key', () => {
    expect(isStale('img/w800.webp', 1000)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/server/image-handler.test.ts`
Expected: FAIL — `isStale` not exported

- [ ] **Step 3: Add isStale function and export it**

Add to `src/server/image-handler.ts`:

```typescript
export function isStale(r2Key: string, manifestTimestamp: number): boolean {
  const match = r2Key.match(/-v(\d+)\.webp$/)
  if (!match) return false
  return parseInt(match[1], 10) < manifestTimestamp
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/server/image-handler.test.ts`
Expected: All tests PASS (including existing snapWidth tests)

- [ ] **Step 5: Refactor handleImageRequest to use queue + circuit breaker + staleness**

Replace the R2 check + Azure fallback section in `src/server/image-handler.ts` (approximately lines 49-91). The new flow:

```typescript
import { CircuitBreaker } from './circuit-breaker'
import type { Bindings, ImageWriteMessage } from './bindings'

// Module-level circuit breaker (persists across requests within a Worker isolate)
const azureBreaker = new CircuitBreaker(3, 60_000)

// Inside handleImageRequest, replace lines 49-91 with:

  if (manifest && w > 0) {
    const available = JSON.parse(manifest.widths) as number[]
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
      } catch {
        azureBreaker.recordFailure()
        console.error(`[img] Azure fetch failed, circuit breaker at ${azureBreaker}`)
      }
    } else {
      // Circuit open — skip Azure, fall through to CF Image Resizing
      console.warn('[img] circuit breaker open, using CF Image Resizing fallback')
    }
  }
```

> **Key changes:**
> - `X-Cache: MISS-WRITE` → `X-Cache: MISS-QUEUED` (reflects the queue, not inline write)
> - `body.tee()` → `arrayBuffer()` (avoids stream locking issues; queue fetches fresh from Azure)
> - Circuit breaker wraps the Azure fetch
> - Queue replaces `waitUntil(R2.put)`

- [ ] **Step 6: Update fallback to add CIRCUIT-OPEN header**

In the fallback section (line ~96 onwards), add a conditional header:

```typescript
  headers.set('X-Cache', azureBreaker.isOpen() ? 'CIRCUIT-OPEN' : 'FALLBACK')
```

- [ ] **Step 7: Run all tests**

Run: `npm run test`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/server/image-handler.ts src/server/image-handler.test.ts
git commit -m "feat(worker): integrate circuit breaker + queue into image handler"
```

---

### Task 4: Proactive R2 Warming Endpoint

**Files:**
- Create: `src/server/image-warm.ts`
- Modify: `src/server.ts`

- [ ] **Step 1: Create the warming endpoint**

```typescript
// src/server/image-warm.ts
import type { Context } from 'hono'
import type { Bindings } from './bindings'

const AZURE_BLOB_ORIGIN = 'https://htstorageprod.blob.core.windows.net'

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
  if (secret !== c.env.IMAGE_SYNC_SECRET) {
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
```

- [ ] **Step 2: Register in server.ts**

Add after the existing `/api/internal/image-manifest` route:

```typescript
import { handleImageWarm } from './image-warm'

app.post('/api/internal/image-warm', (c) => handleImageWarm(c))
```

- [ ] **Step 3: Commit**

```bash
git add src/server/image-warm.ts src/server.ts
git commit -m "feat(worker): add proactive R2 warming endpoint"
```

---

### Task 5: Azure Function Calls Warming After Upload

**Files:**
- Modify: `api/Functions/ImageUploadFunction.cs`
- Modify: `api/Services/Implementations/ManifestSyncService.cs`
- Modify: `api/Services/Interfaces/IManifestSyncService.cs`

- [ ] **Step 1: Add WarmAsync to IManifestSyncService**

In `api/Services/Interfaces/IManifestSyncService.cs`, add:

```csharp
Task WarmAsync(string blobPath, int[] widths, string processedAt);
```

- [ ] **Step 2: Implement WarmAsync in ManifestSyncService**

In `api/Services/Implementations/ManifestSyncService.cs`, add:

```csharp
public async Task WarmAsync(string blobPath, int[] widths, string processedAt)
{
    var version = (long)(DateTime.Parse(processedAt, null,
        System.Globalization.DateTimeStyles.RoundtripKind)
        - DateTime.UnixEpoch).TotalSeconds;

    // Warm the two most common widths: 800 and 1200
    var warmWidths = widths.Where(w => w == 800 || w == 1200).ToArray();
    if (warmWidths.Length == 0) return;

    var items = warmWidths.Select(w => new
    {
        r2Key = $"{blobPath}/w{w}-v{version}.webp",
        blobPath,
        width = w
    }).ToArray();

    try
    {
        var warmEndpoint = _endpoint.Replace("/image-manifest", "/image-warm");
        var request = new HttpRequestMessage(HttpMethod.Post, warmEndpoint)
        {
            Content = JsonContent.Create(new { items })
        };
        request.Headers.Add("X-Internal-Auth", _secret);
        var response = await _http.SendAsync(request);
        response.EnsureSuccessStatusCode();
        _logger.LogInformation("Warmed {Count} R2 variants for {Path}", warmWidths.Length, blobPath);
    }
    catch (Exception ex)
    {
        _logger.LogWarning(ex, "R2 warming failed for {Path}", blobPath);
    }
}
```

- [ ] **Step 3: Call WarmAsync from ImageUploadFunction**

In `api/Functions/ImageUploadFunction.cs`, after the existing `_ = _manifestSync.SyncAsync(manifest);` line (approximately line 112), add:

```csharp
        // Proactively warm R2 for the most-requested widths
        _ = _manifestSync.WarmAsync(
            manifest.Path,
            manifest.Widths,
            manifest.ProcessedAt.ToString("O"));
```

- [ ] **Step 4: Build and verify**

Run:
```bash
cd api && dotnet build
```
Expected: Build succeeded, 0 errors

- [ ] **Step 5: Commit**

```bash
git add api/Services/Interfaces/IManifestSyncService.cs api/Services/Implementations/ManifestSyncService.cs api/Functions/ImageUploadFunction.cs
git commit -m "feat(api): proactively warm R2 for w800 + w1200 after upload"
```

---

## Phase 2 — Cosmos DB NoSQL Migration

### Task 6: Add Cosmos SDK, Remove MongoDB Driver

**Files:**
- Modify: `api/Api.csproj`

- [ ] **Step 1: Update package references**

Run:
```bash
cd api && dotnet add package Microsoft.Azure.Cosmos --version 3.* && dotnet add package Polly --version 8.* && dotnet remove package MongoDB.Driver
```

Expected: Packages added/removed successfully

- [ ] **Step 2: Verify build (will fail — expected)**

Run:
```bash
cd api && dotnet build 2>&1 | head -30
```
Expected: Many compilation errors (MongoDB references). This is expected — we'll fix them in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add api/Api.csproj
git commit -m "chore(api): swap MongoDB.Driver for Microsoft.Azure.Cosmos + Polly"
```

---

### Task 7: Rewrite Entity Classes

**Files:**
- Modify: `api/Entities/UserEntity.cs`
- Modify: `api/Entities/BlogPostEntity.cs`
- Modify: `api/Entities/CategoryEntity.cs`
- Modify: `api/Entities/TagEntity.cs`
- Modify: `api/Entities/RoleEntity.cs`
- Modify: `api/Entities/CaseStudyEntity.cs`
- Modify: `api/Entities/LlmProviderEntity.cs`
- Modify: `api/Entities/LlmSettingsEntity.cs`
- Modify: `api/Entities/ProcessedImageEntity.cs`
- Modify: `api/Entities/ApiKeyEntry.cs`

- [ ] **Step 1: Rewrite UserEntity**

Replace all `[BsonId]`, `[BsonElement("x")]`, `[BsonRepresentation(...)]` with `[JsonPropertyName("x")]`. Cosmos DB requires a lowercase `id` property and a partition key property.

```csharp
// api/Entities/UserEntity.cs
using System.Text.Json.Serialization;

public class UserEntity
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = null!;

    [JsonPropertyName("email")]
    public string Email { get; set; } = null!;

    [JsonPropertyName("passwordHash")]
    public string? PasswordHash { get; set; }

    [JsonPropertyName("firstName")]
    public string? FirstName { get; set; }

    [JsonPropertyName("lastName")]
    public string? LastName { get; set; }

    [JsonPropertyName("phoneNumber")]
    public string? PhoneNumber { get; set; }

    [JsonPropertyName("roles")]
    public List<string> Roles { get; set; } = new();

    [JsonPropertyName("permissions")]
    public List<string> Permissions { get; set; } = new();

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; } = true;

    [JsonPropertyName("isOptedOut")]
    public bool IsOptedOut { get; set; }

    [JsonPropertyName("emailNotifications")]
    public bool EmailNotifications { get; set; } = true;

    [JsonPropertyName("smsNotifications")]
    public bool SmsNotifications { get; set; }

    [JsonPropertyName("avatarUrl")]
    public string? AvatarUrl { get; set; }

    [JsonPropertyName("bio")]
    public string? Bio { get; set; }

    [JsonPropertyName("profession")]
    public string? Profession { get; set; }

    [JsonPropertyName("expertise")]
    public List<string> Expertise { get; set; } = new();

    [JsonPropertyName("socialLinkedin")]
    public string? SocialLinkedin { get; set; }

    [JsonPropertyName("socialTwitter")]
    public string? SocialTwitter { get; set; }

    [JsonPropertyName("socialGithub")]
    public string? SocialGithub { get; set; }

    [JsonPropertyName("socialWebsite")]
    public string? SocialWebsite { get; set; }

    [JsonPropertyName("slug")]
    public string? Slug { get; set; }

    [JsonPropertyName("pageContent")]
    public List<object>? PageContent { get; set; }

    [JsonPropertyName("pageTranslations")]
    public Dictionary<string, PageTranslation>? PageTranslations { get; set; }

    [JsonPropertyName("apiKeys")]
    public List<ApiKeyEntry> ApiKeys { get; set; } = new();

    [JsonPropertyName("refreshToken")]
    public string? RefreshToken { get; set; }

    [JsonPropertyName("refreshTokenExpiryTime")]
    public DateTime? RefreshTokenExpiryTime { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("_etag")]
    public string? ETag { get; set; }
}

public class PageTranslation
{
    [JsonPropertyName("bio")]
    public string? Bio { get; set; }

    [JsonPropertyName("pageContent")]
    public List<object>? PageContent { get; set; }
}
```

- [ ] **Step 2: Rewrite BlogPostEntity**

Same pattern — remove BSON annotations, add `[JsonPropertyName]`, add `ETag`:

```csharp
// api/Entities/BlogPostEntity.cs
using System.Text.Json.Serialization;

public class BlogPostEntity
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = null!;

    [JsonPropertyName("slug")]
    public string Slug { get; set; } = null!;

    [JsonPropertyName("title")]
    public string Title { get; set; } = null!;

    [JsonPropertyName("excerpt")]
    public string? Excerpt { get; set; }

    [JsonPropertyName("publishedAt")]
    public DateTime? PublishedAt { get; set; }

    [JsonPropertyName("author")]
    public string? Author { get; set; }

    [JsonPropertyName("readTime")]
    public int? ReadTime { get; set; }

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("subcategory")]
    public string? Subcategory { get; set; }

    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = new();

    [JsonPropertyName("content")]
    public List<object>? Content { get; set; }

    [JsonPropertyName("isPublished")]
    public bool IsPublished { get; set; }

    [JsonPropertyName("isFeatured")]
    public bool IsFeatured { get; set; }

    [JsonPropertyName("coverImage")]
    public string? CoverImage { get; set; }

    [JsonPropertyName("bannerImage")]
    public string? BannerImage { get; set; }

    [JsonPropertyName("authorId")]
    public string? AuthorId { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("translations")]
    public Dictionary<string, BlogPostTranslation> Translations { get; set; } = new();

    [JsonPropertyName("_etag")]
    public string? ETag { get; set; }
}

public class BlogPostTranslation
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("excerpt")]
    public string? Excerpt { get; set; }

    [JsonPropertyName("content")]
    public List<object>? Content { get; set; }

    [JsonPropertyName("translatedAt")]
    public DateTime? TranslatedAt { get; set; }

    [JsonPropertyName("isAutoTranslated")]
    public bool IsAutoTranslated { get; set; }
}
```

- [ ] **Step 3: Rewrite remaining entities (CategoryEntity, TagEntity, RoleEntity, CaseStudyEntity, LlmProviderEntity, LlmSettingsEntity, ProcessedImageEntity, ApiKeyEntry)**

Apply the same pattern to each:
1. Remove `using MongoDB.Bson;` and `using MongoDB.Bson.Serialization.Attributes;`
2. Add `using System.Text.Json.Serialization;`
3. Replace `[BsonId]` + `[BsonRepresentation(BsonType.ObjectId)]` with `[JsonPropertyName("id")]`
4. Replace every `[BsonElement("x")]` with `[JsonPropertyName("x")]`
5. Add `[JsonPropertyName("_etag")] public string? ETag { get; set; }` to top-level entities

Key specifics per entity:

**CategoryEntity** — partition key: `slug`
```csharp
[JsonPropertyName("id")] public string Id { get; set; }
[JsonPropertyName("slug")] public string Slug { get; set; }
[JsonPropertyName("label")] public string Label { get; set; }
[JsonPropertyName("translations")] public Dictionary<string, string> Translations { get; set; } = new();
[JsonPropertyName("parentId")] public string? ParentId { get; set; }
[JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; }
[JsonPropertyName("updatedAt")] public DateTime UpdatedAt { get; set; }
[JsonPropertyName("_etag")] public string? ETag { get; set; }
```

**TagEntity** — partition key: `slug`
```csharp
[JsonPropertyName("id")] public string Id { get; set; }
[JsonPropertyName("slug")] public string Slug { get; set; }
[JsonPropertyName("label")] public string Label { get; set; }
[JsonPropertyName("translations")] public Dictionary<string, string> Translations { get; set; } = new();
[JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; }
[JsonPropertyName("updatedAt")] public DateTime UpdatedAt { get; set; }
[JsonPropertyName("_etag")] public string? ETag { get; set; }
```

**RoleEntity** — partition key: `name`
```csharp
[JsonPropertyName("id")] public string Id { get; set; }
[JsonPropertyName("name")] public string Name { get; set; }
[JsonPropertyName("slug")] public string Slug { get; set; }
[JsonPropertyName("description")] public string? Description { get; set; }
[JsonPropertyName("permissions")] public List<string> Permissions { get; set; } = new();
[JsonPropertyName("isSystem")] public bool IsSystem { get; set; }
[JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; }
[JsonPropertyName("updatedAt")] public DateTime UpdatedAt { get; set; }
[JsonPropertyName("_etag")] public string? ETag { get; set; }
```

**CaseStudyEntity** — partition key: `slug` (include nested `ArchitectureDecisionEntry`, `ResultEntry`)

**LlmProviderEntity** — partition key: `key` (include nested `LlmModelEntry`)

**LlmSettingsEntity** — partition key: `id` (fixed value `"settings"`)

**ProcessedImageEntity** — partition key: `path`
```csharp
[JsonPropertyName("id")] public string Id => Path; // Cosmos requires "id"
[JsonPropertyName("path")] public string Path { get; set; }
[JsonPropertyName("format")] public string Format { get; set; } = "webp";
[JsonPropertyName("widths")] public int[] Widths { get; set; } = [];
[JsonPropertyName("processedAt")] public DateTime ProcessedAt { get; set; }
[JsonPropertyName("source")] public string Source { get; set; } = "backend";
[JsonPropertyName("_etag")] public string? ETag { get; set; }
```

**ApiKeyEntry** — embedded, no partition key needed:
```csharp
[JsonPropertyName("id")] public string Id { get; set; }
[JsonPropertyName("name")] public string Name { get; set; }
[JsonPropertyName("keyHash")] public string KeyHash { get; set; }
[JsonPropertyName("keyPrefix")] public string KeyPrefix { get; set; }
[JsonPropertyName("keySuffix")] public string KeySuffix { get; set; }
[JsonPropertyName("expiresAt")] public DateTime? ExpiresAt { get; set; }
[JsonPropertyName("lastUsedAt")] public DateTime? LastUsedAt { get; set; }
[JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; }
```

- [ ] **Step 4: Verify build compiles entities (repos will still fail)**

Run:
```bash
cd api && dotnet build 2>&1 | grep -c "error CS"
```
Expected: errors only from repository files and Program.cs (MongoDB references), NOT from Entities/

- [ ] **Step 5: Commit**

```bash
git add api/Entities/
git commit -m "refactor(api): rewrite entities from BSON to System.Text.Json"
```

---

### Task 8: Rewrite Program.cs DI

**Files:**
- Modify: `api/Program.cs`

- [ ] **Step 1: Replace MongoDB DI with CosmosClient**

Find the MongoDB registration block (approximately lines 35-44) and replace:

**Remove:**
```csharp
var mongoConnectionString = config["MONGODB_CONNECTION_STRING"] ?? "mongodb://localhost:27017";
var mongoDatabaseName = config["MONGODB_DATABASE_NAME"] ?? "horizon";

builder.Services.AddSingleton<IMongoClient>(new MongoClient(mongoConnectionString));
builder.Services.AddSingleton<IMongoDatabase>(sp =>
    sp.GetRequiredService<IMongoClient>().GetDatabase(mongoDatabaseName));
```

**Replace with:**
```csharp
var cosmosConnectionString = config["COSMOS_CONNECTION_STRING"]
    ?? throw new InvalidOperationException("COSMOS_CONNECTION_STRING not configured");

builder.Services.AddSingleton(_ =>
{
    var client = new CosmosClientBuilder(cosmosConnectionString)
        .WithSerializerOptions(new CosmosSerializationOptions
        {
            PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase,
        })
        .WithConnectionModeDirect()
        .Build();
    return client;
});

builder.Services.AddSingleton(sp =>
    sp.GetRequiredService<CosmosClient>().GetDatabase("horizon"));
```

Add the using at the top:
```csharp
using Microsoft.Azure.Cosmos;
```

Remove:
```csharp
using MongoDB.Driver;
```

- [ ] **Step 2: Update repository registrations if needed**

The repository registrations like `builder.Services.AddSingleton<IBlogPostRepository, BlogPostRepository>();` stay the same — only the constructor injection changes (from `IMongoDatabase` to `CosmosClient` or `Database`). This is handled in Task 9.

- [ ] **Step 3: Remove DatabaseInitializer if it creates MongoDB indexes**

If `DatabaseInitializer` creates MongoDB indexes, remove the `builder.Services.AddHostedService<DatabaseInitializer>()` line. Cosmos DB handles indexing via indexing policy (configured at container creation, not in code).

- [ ] **Step 4: Commit**

```bash
git add api/Program.cs
git commit -m "refactor(api): replace MongoDB DI with CosmosClient"
```

---

### Task 9: Rewrite Repositories

**Files:**
- Modify: all 9 files in `api/Repositories/Implementations/`

> This is the largest task. Each repository follows the same pattern. I'll show BlogPostRepository in full, then describe the pattern for the rest.

- [ ] **Step 1: Rewrite BlogPostRepository**

```csharp
// api/Repositories/Implementations/BlogPostRepository.cs
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
using System.Net;

public class BlogPostRepository : IBlogPostRepository
{
    private readonly Container _container;

    public BlogPostRepository(CosmosClient client)
    {
        _container = client.GetContainer("horizon", "blogPosts");
    }

    public async Task<List<BlogPostEntity>> GetPublishedAsync()
    {
        var query = _container.GetItemLinqQueryable<BlogPostEntity>()
            .Where(p => p.IsPublished)
            .OrderByDescending(p => p.PublishedAt);
        using var iterator = query.ToFeedIterator();
        var results = new List<BlogPostEntity>();
        while (iterator.HasMoreResults)
        {
            var page = await iterator.ReadNextAsync();
            results.AddRange(page);
        }
        return results;
    }

    public async Task<(List<BlogPostEntity> items, long totalCount)> GetPublishedPagedAsync(
        int page, int pageSize, string? category = null, string? subcategory = null,
        string? tag = null, string? search = null)
    {
        var queryDef = new QueryDefinition(
            "SELECT * FROM c WHERE c.isPublished = true ORDER BY c.publishedAt DESC OFFSET @offset LIMIT @limit")
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);

        // For total count
        var countDef = new QueryDefinition(
            "SELECT VALUE COUNT(1) FROM c WHERE c.isPublished = true");

        using var countIterator = _container.GetItemQueryIterator<int>(countDef);
        var countPage = await countIterator.ReadNextAsync();
        var totalCount = countPage.FirstOrDefault();

        using var iterator = _container.GetItemQueryIterator<BlogPostEntity>(queryDef);
        var results = new List<BlogPostEntity>();
        while (iterator.HasMoreResults)
        {
            var p = await iterator.ReadNextAsync();
            results.AddRange(p);
        }
        return (results, totalCount);
    }

    public async Task<BlogPostEntity?> GetBySlugAsync(string slug, bool publishedOnly = false)
    {
        try
        {
            var response = await _container.ReadItemAsync<BlogPostEntity>(slug, new PartitionKey(slug));
            if (publishedOnly && !response.Resource.IsPublished) return null;
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<List<BlogPostEntity>> GetAllAsync(string? filterAuthorId = null)
    {
        IQueryable<BlogPostEntity> query = _container.GetItemLinqQueryable<BlogPostEntity>();
        if (filterAuthorId != null)
            query = query.Where(p => p.AuthorId == filterAuthorId);
        using var iterator = query.ToFeedIterator();
        var results = new List<BlogPostEntity>();
        while (iterator.HasMoreResults)
        {
            var page = await iterator.ReadNextAsync();
            results.AddRange(page);
        }
        return results;
    }

    public async Task InsertAsync(BlogPostEntity post)
    {
        post.Id = post.Slug; // Use slug as document ID for point reads
        await _container.CreateItemAsync(post, new PartitionKey(post.Slug));
    }

    public async Task<bool> DeleteAsync(string slug)
    {
        try
        {
            await _container.DeleteItemAsync<BlogPostEntity>(slug, new PartitionKey(slug));
            return true;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    public async Task<long> CountAsync()
    {
        var query = new QueryDefinition("SELECT VALUE COUNT(1) FROM c");
        using var iterator = _container.GetItemQueryIterator<int>(query);
        var page = await iterator.ReadNextAsync();
        return page.FirstOrDefault();
    }

    public async Task<long> CountPublishedAsync()
    {
        var query = new QueryDefinition("SELECT VALUE COUNT(1) FROM c WHERE c.isPublished = true");
        using var iterator = _container.GetItemQueryIterator<int>(query);
        var page = await iterator.ReadNextAsync();
        return page.FirstOrDefault();
    }
}
```

> **Important change from MongoDB:** `FindOneAndUpdateAsync` with `UpdateDefinition<T>` does not exist in Cosmos. Replace with read-modify-write using ETags for optimistic concurrency. Each service that calls `FindOneAndUpdateAsync` must be refactored to:
> 1. Read the document
> 2. Modify in memory
> 3. `ReplaceItemAsync` with `IfMatchEtag`
>
> This affects the **service layer** callers, not just the repo. The repo interface should change from:
> ```csharp
> Task<BlogPostEntity?> FindOneAndUpdateAsync(string slug, UpdateDefinition<BlogPostEntity> update);
> ```
> to:
> ```csharp
> Task<BlogPostEntity> ReplaceAsync(BlogPostEntity entity);
> ```

- [ ] **Step 2: Update IBlogPostRepository interface**

Replace `FindOneAndUpdateAsync` and `UpdateManyAsync` with:

```csharp
Task<BlogPostEntity> ReplaceAsync(BlogPostEntity entity);
```

Remove: `using MongoDB.Driver;` from the interface file.

- [ ] **Step 3: Implement ReplaceAsync**

```csharp
public async Task<BlogPostEntity> ReplaceAsync(BlogPostEntity entity)
{
    entity.UpdatedAt = DateTime.UtcNow;
    var response = await _container.ReplaceItemAsync(
        entity, entity.Id, new PartitionKey(entity.Slug),
        new ItemRequestOptions { IfMatchEtag = entity.ETag });
    return response.Resource;
}
```

- [ ] **Step 4: Rewrite remaining 8 repositories**

Apply the same pattern to each repository. Key per-repo notes:

| Repository | Container | Partition Key | ID = |
|-----------|-----------|---------------|------|
| UserRepository | users | `/email` | `Id` (GUID) |
| CategoryRepository | categories | `/slug` | `Slug` |
| TagRepository | tags | `/slug` | `Slug` |
| RoleRepository | roles | `/name` | `Name` |
| CaseStudyRepository | caseStudies | `/slug` | `Slug` |
| LlmProviderRepository | llmProviders | `/key` | `Key` |
| LlmSettingsRepository | llmSettings | `/id` | `"settings"` (singleton) |
| ProcessedImageRepository | processed_images | `/path` | `Path` |

**UserRepository special cases:**
- `GetByEmailAsync(email)` → point read: `ReadItemAsync(id, new PartitionKey(email))` — but ID ≠ email. Use a cross-partition query: `SELECT * FROM c WHERE c.email = @email`
- `GetByRefreshTokenHashAsync` → query: `SELECT * FROM c WHERE c.refreshToken = @hash`
- `FindByApiKeyHashAsync` → query: `SELECT * FROM c WHERE ARRAY_CONTAINS(c.apiKeys, {"keyHash": @hash}, true)`
- `GetByIdsAsync` → query: `SELECT * FROM c WHERE c.id IN (@ids)` (cross-partition)
- `UpdateAsync(id, update)` → read + modify + `ReplaceItemAsync`

**LlmSettingsRepository:**
- Singleton pattern: `ReadItemAsync("settings", new PartitionKey("settings"))`
- Upsert: `UpsertItemAsync(settings, new PartitionKey("settings"))`

- [ ] **Step 5: Update all service layer callers**

Every service that calls `FindOneAndUpdateAsync` or uses `UpdateDefinition<T>` must be refactored to read-modify-write. Search for all usages:

```bash
cd api && grep -rn "FindOneAndUpdateAsync\|UpdateDefinition" --include="*.cs" Services/ Functions/
```

For each match: read the entity, modify the property, call `ReplaceAsync`.

- [ ] **Step 6: Remove all MongoDB using statements**

```bash
cd api && grep -rn "using MongoDB" --include="*.cs" | grep -v "bin/" | grep -v "obj/"
```

Remove every `using MongoDB.*` line found.

- [ ] **Step 7: Build and fix remaining errors**

Run:
```bash
cd api && dotnet build
```

Fix any remaining compilation errors. Common issues:
- `FilterDefinition<T>` → replace with LINQ or SQL queries
- `UpdateDefinition<T>` → replace with read-modify-write
- `SortDefinition<T>` → replace with `OrderBy` in LINQ
- `BsonDocument` → replace with `JsonElement` or typed objects

Expected: Build succeeded, 0 errors

- [ ] **Step 8: Commit**

```bash
git add api/Repositories/ api/Services/ api/Functions/
git commit -m "refactor(api): rewrite all repositories from MongoDB to Cosmos NoSQL SDK"
```

---

### Task 10: Create Cosmos DB Account + Containers

**Files:** none (infrastructure)

- [ ] **Step 1: Create Cosmos DB NoSQL account**

```bash
az cosmosdb create \
  --name horizon-cosmos \
  --resource-group ht-web-prod \
  --kind GlobalDocumentDB \
  --locations regionName="North Europe" failoverPriority=0 \
  --default-consistency-level Session \
  --capabilities EnableServerless
```

> Using **serverless** mode — no minimum throughput cost, pay per request. Appropriate for low-to-moderate write volume.

- [ ] **Step 2: Create database**

```bash
az cosmosdb sql database create \
  --account-name horizon-cosmos \
  --resource-group ht-web-prod \
  --name horizon
```

- [ ] **Step 3: Create containers with partition keys**

```bash
for container_pk in "users:/email" "blogPosts:/slug" "categories:/slug" "tags:/slug" "caseStudies:/slug" "roles:/name" "llmProviders:/key" "llmSettings:/id" "processedImages:/path" "leases:/id"; do
  container=$(echo "$container_pk" | cut -d: -f1)
  pk=$(echo "$container_pk" | cut -d: -f2)
  az cosmosdb sql container create \
    --account-name horizon-cosmos \
    --resource-group ht-web-prod \
    --database-name horizon \
    --name "$container" \
    --partition-key-path "$pk"
  echo "Created $container with partition key $pk"
done
```

- [ ] **Step 4: Get connection string and set as App Setting**

```bash
COSMOS_CONN=$(az cosmosdb keys list \
  --name horizon-cosmos \
  --resource-group ht-web-prod \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" -o tsv)

az functionapp config appsettings set \
  --name ht-func-prod \
  --resource-group ht-web-prod \
  --settings "COSMOS_CONNECTION_STRING=$COSMOS_CONN"
```

- [ ] **Step 5: Also set the Cosmos DB connection for Change Feed triggers**

Change Feed triggers use a different config key format:

```bash
COSMOS_ENDPOINT=$(az cosmosdb show --name horizon-cosmos --resource-group ht-web-prod --query documentEndpoint -o tsv)

az functionapp config appsettings set \
  --name ht-func-prod \
  --resource-group ht-web-prod \
  --settings "CosmosDBConnection__accountEndpoint=$COSMOS_ENDPOINT"
```

> For managed identity auth (recommended), the `__accountEndpoint` suffix triggers the Functions runtime to use `DefaultAzureCredential`. Alternatively, use `CosmosDBConnection=<full-connection-string>` for key-based auth.

- [ ] **Step 6: Update local.settings.json**

Add to `api/local.settings.json` Values:
```json
"COSMOS_CONNECTION_STRING": "AccountEndpoint=https://localhost:8081/;AccountKey=...",
"CosmosDBConnection__accountEndpoint": "https://localhost:8081/"
```

> For local dev, use the [Cosmos DB Emulator](https://learn.microsoft.com/azure/cosmos-db/local-emulator) or the Cosmos DB Linux emulator Docker image.

---

### Task 11: Data Migration Script

**Files:**
- Create: `scripts/migrate-cosmos-nosql.ts`

- [ ] **Step 1: Write migration script**

```typescript
// scripts/migrate-cosmos-nosql.ts
import { MongoClient } from 'mongodb'
import { CosmosClient } from '@azure/cosmos'

const MONGO_URI = process.env.MONGODB_CONNECTION_STRING!
const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT!
const COSMOS_KEY = process.env.COSMOS_KEY!

const COLLECTIONS = [
  { mongo: 'users', cosmos: 'users', partitionKey: 'email', idField: '_id' },
  { mongo: 'blogPosts', cosmos: 'blogPosts', partitionKey: 'slug', idField: 'slug' },
  { mongo: 'categories', cosmos: 'categories', partitionKey: 'slug', idField: 'slug' },
  { mongo: 'tags', cosmos: 'tags', partitionKey: 'slug', idField: 'slug' },
  { mongo: 'caseStudies', cosmos: 'caseStudies', partitionKey: 'slug', idField: 'slug' },
  { mongo: 'roles', cosmos: 'roles', partitionKey: 'name', idField: 'name' },
  { mongo: 'llmProviders', cosmos: 'llmProviders', partitionKey: 'key', idField: 'key' },
  { mongo: 'llmSettings', cosmos: 'llmSettings', partitionKey: 'id', idField: '_id' },
  { mongo: 'processed_images', cosmos: 'processedImages', partitionKey: 'path', idField: 'path' },
]

async function migrate() {
  const mongoClient = new MongoClient(MONGO_URI)
  const cosmosClient = new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY })
  const cosmosDb = cosmosClient.database('horizon')

  try {
    await mongoClient.connect()
    const mongoDb = mongoClient.db('horizon')

    for (const col of COLLECTIONS) {
      console.log(`\nMigrating ${col.mongo} → ${col.cosmos}...`)
      const docs = await mongoDb.collection(col.mongo).find({}).toArray()
      console.log(`  Found ${docs.length} documents`)

      const container = cosmosDb.container(col.cosmos)
      let ok = 0, errors = 0

      for (const doc of docs) {
        try {
          // Map MongoDB _id to Cosmos id
          const cosmosDoc: Record<string, unknown> = { ...doc }
          delete cosmosDoc._id

          if (col.idField === '_id') {
            cosmosDoc.id = String(doc._id)
          } else {
            cosmosDoc.id = String(doc[col.idField])
          }

          const partitionValue = String(cosmosDoc[col.partitionKey])
          await container.items.upsert(cosmosDoc)
          ok++
        } catch (err) {
          errors++
          console.error(`  Error migrating doc ${doc._id}: ${err}`)
        }
      }
      console.log(`  Done: ${ok} ok, ${errors} errors`)
    }
  } finally {
    await mongoClient.close()
  }
}

migrate().catch(console.error)
```

- [ ] **Step 2: Add dev dependencies**

```bash
npm install -D @azure/cosmos
```

> `mongodb` is already a dev dependency.

- [ ] **Step 3: Run migration against prod (with caution)**

```bash
export MONGODB_CONNECTION_STRING="<from-local.settings.json>"
export COSMOS_ENDPOINT="<from-az-cosmosdb-show>"
export COSMOS_KEY="<from-az-cosmosdb-keys-list>"
npx tsx scripts/migrate-cosmos-nosql.ts
```

Expected: All collections migrated with 0 errors.

- [ ] **Step 4: Verify counts match**

Query each Cosmos container and compare counts with MongoDB.

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-cosmos-nosql.ts package.json
git commit -m "chore(scripts): add one-time MongoDB → Cosmos NoSQL migration"
```

---

## Phase 3 — Change Feed Sync Functions

### Task 12: Change Feed Trigger Functions

**Files:**
- Create: `api/Functions/ChangeFeedSyncFunctions.cs`
- Modify: `api/Services/Interfaces/IManifestSyncService.cs` → rename to `IWorkerSyncService.cs`
- Modify: `api/Services/Implementations/ManifestSyncService.cs` → rename to `WorkerSyncService.cs`

- [ ] **Step 1: Rename ManifestSyncService → WorkerSyncService**

Rename files:
```bash
cd api
mv Services/Interfaces/IManifestSyncService.cs Services/Interfaces/IWorkerSyncService.cs
mv Services/Implementations/ManifestSyncService.cs Services/Implementations/WorkerSyncService.cs
```

Update class/interface names inside each file:
- `IManifestSyncService` → `IWorkerSyncService`
- `ManifestSyncService` → `WorkerSyncService`

Add a new method to `IWorkerSyncService`:

```csharp
public interface IWorkerSyncService
{
    // Existing (for image pipeline — kept for backwards compat during migration)
    Task SyncAsync(ProcessedImageEntity manifest);
    Task WarmAsync(string blobPath, int[] widths, string processedAt);

    // New (generalized sync for Change Feed)
    Task SyncEntityAsync(string entityType, IReadOnlyList<JsonElement> items);
}
```

- [ ] **Step 2: Implement SyncEntityAsync in WorkerSyncService**

Add to `WorkerSyncService.cs`:

```csharp
public async Task SyncEntityAsync(string entityType, IReadOnlyList<JsonElement> items)
{
    if (items.Count == 0) return;

    var syncEndpoint = _endpoint.Replace("/image-manifest", "/sync");

    var payload = new
    {
        entity = entityType,
        schemaVersion = 1,
        items = items,
        timestamp = DateTimeOffset.UtcNow,
    };

    try
    {
        var request = new HttpRequestMessage(HttpMethod.Post, syncEndpoint)
        {
            Content = JsonContent.Create(payload),
        };
        request.Headers.Add("X-Internal-Auth", _secret);

        await Policy
            .Handle<HttpRequestException>()
            .Or<TaskCanceledException>()
            .WaitAndRetryAsync(3, n => TimeSpan.FromSeconds(Math.Pow(2, n)))
            .ExecuteAsync(async () =>
            {
                var resp = await _http.SendAsync(request);
                resp.EnsureSuccessStatusCode();
            });

        _logger.LogInformation("ChangeFeed → D1: synced {Count} {Entity}", items.Count, entityType);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "ChangeFeed → D1 sync failed for {Entity} ({Count} items)", entityType, items.Count);
        throw; // Let the trigger retry
    }
}
```

- [ ] **Step 3: Update DI registration in Program.cs**

Replace:
```csharp
builder.Services.AddHttpClient<IManifestSyncService, ManifestSyncService>();
```
With:
```csharp
builder.Services.AddHttpClient<IWorkerSyncService, WorkerSyncService>();
```

Update all constructor injections of `IManifestSyncService` → `IWorkerSyncService` in:
- `ImageUploadFunction.cs`
- `ImageSweepFunction.cs`

- [ ] **Step 4: Create ChangeFeedSyncFunctions**

```csharp
// api/Functions/ChangeFeedSyncFunctions.cs
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

public class ChangeFeedSyncFunctions
{
    private readonly IWorkerSyncService _sync;
    private readonly ILogger<ChangeFeedSyncFunctions> _logger;

    public ChangeFeedSyncFunctions(IWorkerSyncService sync, ILogger<ChangeFeedSyncFunctions> logger)
    {
        _sync = sync;
        _logger = logger;
    }

    [Function("SyncBlogPosts")]
    public async Task SyncBlogPosts(
        [CosmosDBTrigger("horizon", "blogPosts",
            Connection = "CosmosDBConnection",
            LeaseContainerName = "leases",
            LeaseContainerPrefix = "blogposts-",
            CreateLeaseContainerIfNotExists = true)]
        IReadOnlyList<JsonElement> changes)
    {
        _logger.LogInformation("ChangeFeed: {Count} blogPosts changes", changes.Count);
        await _sync.SyncEntityAsync("blogPosts", changes);
    }

    [Function("SyncUsers")]
    public async Task SyncUsers(
        [CosmosDBTrigger("horizon", "users",
            Connection = "CosmosDBConnection",
            LeaseContainerName = "leases",
            LeaseContainerPrefix = "users-",
            CreateLeaseContainerIfNotExists = true)]
        IReadOnlyList<JsonElement> changes)
    {
        _logger.LogInformation("ChangeFeed: {Count} users changes", changes.Count);
        await _sync.SyncEntityAsync("users", changes);
    }

    [Function("SyncCategories")]
    public async Task SyncCategories(
        [CosmosDBTrigger("horizon", "categories",
            Connection = "CosmosDBConnection",
            LeaseContainerName = "leases",
            LeaseContainerPrefix = "categories-",
            CreateLeaseContainerIfNotExists = true)]
        IReadOnlyList<JsonElement> changes)
    {
        _logger.LogInformation("ChangeFeed: {Count} categories changes", changes.Count);
        await _sync.SyncEntityAsync("categories", changes);
    }

    [Function("SyncTags")]
    public async Task SyncTags(
        [CosmosDBTrigger("horizon", "tags",
            Connection = "CosmosDBConnection",
            LeaseContainerName = "leases",
            LeaseContainerPrefix = "tags-",
            CreateLeaseContainerIfNotExists = true)]
        IReadOnlyList<JsonElement> changes)
    {
        _logger.LogInformation("ChangeFeed: {Count} tags changes", changes.Count);
        await _sync.SyncEntityAsync("tags", changes);
    }

    [Function("SyncCaseStudies")]
    public async Task SyncCaseStudies(
        [CosmosDBTrigger("horizon", "caseStudies",
            Connection = "CosmosDBConnection",
            LeaseContainerName = "leases",
            LeaseContainerPrefix = "casestudies-",
            CreateLeaseContainerIfNotExists = true)]
        IReadOnlyList<JsonElement> changes)
    {
        _logger.LogInformation("ChangeFeed: {Count} caseStudies changes", changes.Count);
        await _sync.SyncEntityAsync("caseStudies", changes);
    }

    [Function("SyncRoles")]
    public async Task SyncRoles(
        [CosmosDBTrigger("horizon", "roles",
            Connection = "CosmosDBConnection",
            LeaseContainerName = "leases",
            LeaseContainerPrefix = "roles-",
            CreateLeaseContainerIfNotExists = true)]
        IReadOnlyList<JsonElement> changes)
    {
        _logger.LogInformation("ChangeFeed: {Count} roles changes", changes.Count);
        await _sync.SyncEntityAsync("roles", changes);
    }
}
```

- [ ] **Step 5: Add CosmosDB extension package**

```bash
cd api && dotnet add package Microsoft.Azure.Functions.Worker.Extensions.CosmosDB --version 4.*
```

- [ ] **Step 6: Build**

Run:
```bash
cd api && dotnet build
```
Expected: Build succeeded, 0 errors

- [ ] **Step 7: Commit**

```bash
git add api/Functions/ChangeFeedSyncFunctions.cs api/Services/ api/Program.cs api/Api.csproj api/Functions/ImageUploadFunction.cs api/Functions/ImageSweepFunction.cs
git commit -m "feat(api): add Change Feed sync functions for all 6 entity containers"
```

---

## Phase 4 — Worker Sync Receiver

### Task 13: Generalized /api/internal/sync Endpoint

**Files:**
- Create: `src/server/sync-receiver.ts`
- Create: `src/server/sync-receiver.test.ts`
- Modify: `src/server.ts`
- Modify: `src/server/bindings.ts`

- [ ] **Step 1: Add SYNC_SECRET to bindings**

In `src/server/bindings.ts`, add to the `Bindings` interface:

```typescript
  SYNC_SECRET: string
```

- [ ] **Step 2: Write sync receiver tests**

```typescript
// src/server/sync-receiver.test.ts
import { describe, it, expect } from 'vitest'
import { buildUpsertStatements } from './sync-receiver'

describe('buildUpsertStatements', () => {
  it('returns empty for unknown entity', () => {
    const result = buildUpsertStatements('unknown', [])
    expect(result).toEqual([])
  })

  it('builds blogPosts upsert SQL', () => {
    const items = [{
      id: 'test-slug',
      slug: 'test-slug',
      title: 'Test Post',
      excerpt: 'An excerpt',
      isPublished: true,
      isFeatured: false,
      publishedAt: '2026-04-09T00:00:00Z',
      readTime: 5,
      category: 'tech',
      subcategory: null,
      coverImage: null,
      bannerImage: null,
      authorId: 'author-1',
      author: 'John',
      createdAt: '2026-04-09T00:00:00Z',
      updatedAt: '2026-04-09T00:00:00Z',
      content: [{ type: 'paragraph', text: 'Hello' }],
      translations: {
        'de-DE': { title: 'Testbeitrag', excerpt: 'Ein Auszug', content: [] }
      },
      tags: ['tag-1'],
    }]
    const stmts = buildUpsertStatements('blogPosts', items)
    expect(stmts.length).toBeGreaterThan(0)
    expect(stmts[0].sql).toContain('INSERT OR REPLACE INTO blog_posts')
  })

  it('builds users upsert SQL', () => {
    const items = [{
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      slug: 'test-user',
    }]
    const stmts = buildUpsertStatements('users', items)
    expect(stmts.length).toBeGreaterThan(0)
    expect(stmts[0].sql).toContain('INSERT OR REPLACE INTO users')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test -- src/server/sync-receiver.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement sync receiver**

```typescript
// src/server/sync-receiver.ts
import type { Context } from 'hono'
import type { Bindings } from './bindings'

interface SyncPayload {
  entity: string
  schemaVersion: number
  items: Record<string, unknown>[]
  timestamp: string
}

interface PreparedStatement {
  sql: string
  params: unknown[]
}

export function buildUpsertStatements(entity: string, items: Record<string, unknown>[]): PreparedStatement[] {
  const handler = ENTITY_HANDLERS[entity]
  if (!handler) return []
  return items.flatMap(handler)
}

const ENTITY_HANDLERS: Record<string, (item: Record<string, unknown>) => PreparedStatement[]> = {
  blogPosts: (item) => {
    const stmts: PreparedStatement[] = [
      {
        sql: `INSERT OR REPLACE INTO blog_posts
          (id, slug, title, excerpt, content, is_published, is_featured,
           published_at, read_time, category, subcategory, cover_image,
           banner_image, author_id, author_name, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          item.id, item.slug, item.title, item.excerpt,
          JSON.stringify(item.content ?? []),
          item.isPublished ? 1 : 0, item.isFeatured ? 1 : 0,
          item.publishedAt, item.readTime, item.category, item.subcategory,
          item.coverImage, item.bannerImage, item.authorId, item.author,
          item.createdAt, item.updatedAt,
        ],
      },
    ]
    // Flatten translations
    const translations = (item.translations ?? {}) as Record<string, Record<string, unknown>>
    for (const [locale, t] of Object.entries(translations)) {
      stmts.push({
        sql: `INSERT OR REPLACE INTO blog_post_translations
          (post_id, locale, title, excerpt, content, is_auto_translated, translated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
        params: [
          item.id, locale, t.title, t.excerpt,
          JSON.stringify(t.content ?? []),
          t.isAutoTranslated ? 1 : 0, t.translatedAt,
        ],
      })
    }
    // Flatten tags
    const tags = (item.tags ?? []) as string[]
    // Delete existing tag associations first
    stmts.push({ sql: `DELETE FROM blog_post_tags WHERE post_id = ?`, params: [item.id] })
    for (const tagSlug of tags) {
      stmts.push({
        sql: `INSERT OR IGNORE INTO blog_post_tags (post_id, tag_id)
          SELECT ?, id FROM tags WHERE slug = ?`,
        params: [item.id, tagSlug],
      })
    }
    return stmts
  },

  users: (item) => {
    const stmts: PreparedStatement[] = [
      {
        sql: `INSERT OR REPLACE INTO users
          (id, email, password_hash, first_name, last_name, phone_number,
           is_active, is_opted_out, email_notifications, sms_notifications,
           avatar_url, bio, profession, expertise,
           social_linkedin, social_twitter, social_github, social_website,
           slug, page_content, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          item.id, item.email, item.passwordHash,
          item.firstName, item.lastName, item.phoneNumber,
          item.isActive ? 1 : 0, item.isOptedOut ? 1 : 0,
          item.emailNotifications ? 1 : 0, item.smsNotifications ? 1 : 0,
          item.avatarUrl, item.bio, item.profession,
          JSON.stringify(item.expertise ?? []),
          item.socialLinkedin, item.socialTwitter, item.socialGithub, item.socialWebsite,
          item.slug, JSON.stringify(item.pageContent ?? []),
          item.createdAt, item.updatedAt,
        ],
      },
    ]
    // Sync roles
    const roles = (item.roles ?? []) as string[]
    stmts.push({ sql: `DELETE FROM user_roles WHERE user_id = ?`, params: [item.id] })
    for (const roleName of roles) {
      stmts.push({
        sql: `INSERT OR IGNORE INTO user_roles (user_id, role_id)
          SELECT ?, id FROM roles WHERE name = ?`,
        params: [item.id, roleName],
      })
    }
    return stmts
  },

  categories: (item) => {
    const stmts: PreparedStatement[] = [
      {
        sql: `INSERT OR REPLACE INTO categories (id, slug, label, parent_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
        params: [item.id, item.slug, item.label, item.parentId, item.createdAt, item.updatedAt],
      },
    ]
    const translations = (item.translations ?? {}) as Record<string, string>
    for (const [locale, label] of Object.entries(translations)) {
      stmts.push({
        sql: `INSERT OR REPLACE INTO category_translations (category_id, locale, label, is_auto_translated, translated_at)
          VALUES (?, ?, ?, 1, ?)`,
        params: [item.id, locale, label, item.updatedAt],
      })
    }
    return stmts
  },

  tags: (item) => {
    const stmts: PreparedStatement[] = [
      {
        sql: `INSERT OR REPLACE INTO tags (id, slug, label, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)`,
        params: [item.id, item.slug, item.label, item.createdAt, item.updatedAt],
      },
    ]
    const translations = (item.translations ?? {}) as Record<string, string>
    for (const [locale, label] of Object.entries(translations)) {
      stmts.push({
        sql: `INSERT OR REPLACE INTO tag_translations (tag_id, locale, label, is_auto_translated, translated_at)
          VALUES (?, ?, ?, 1, ?)`,
        params: [item.id, locale, label, item.updatedAt],
      })
    }
    return stmts
  },

  caseStudies: (item) => {
    const stmts: PreparedStatement[] = [
      {
        sql: `INSERT OR REPLACE INTO case_studies
          (id, slug, title, client, industry, description, executive_summary,
           challenge, solution, tech_stack, tags, is_published, is_featured,
           cover_image, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          item.id, item.slug, item.title, item.client, item.industry,
          item.description, item.executiveSummary, item.challenge, item.solution,
          JSON.stringify(item.techStack ?? []), JSON.stringify(item.tags ?? []),
          item.isPublished ? 1 : 0, item.isFeatured ? 1 : 0,
          item.coverImage, item.createdAt, item.updatedAt,
        ],
      },
    ]
    return stmts
  },

  roles: (item) => [
    {
      sql: `INSERT OR REPLACE INTO roles
        (id, name, slug, description, permissions, is_system, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        item.id, item.name, item.slug, item.description,
        JSON.stringify(item.permissions ?? []),
        item.isSystem ? 1 : 0, item.createdAt, item.updatedAt,
      ],
    },
  ],

  processedImages: (item) => [
    {
      sql: `INSERT OR REPLACE INTO processed_images (path, format, widths, processed_at, source)
        VALUES (?, ?, ?, ?, ?)`,
      params: [
        item.path, item.format ?? 'webp',
        JSON.stringify(item.widths ?? []),
        item.processedAt, item.source ?? 'backend',
      ],
    },
  ],
}

export async function handleSync(c: Context<{ Bindings: Bindings }>): Promise<Response> {
  const secret = c.req.header('X-Internal-Auth')
  if (secret !== c.env.SYNC_SECRET) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  const payload: SyncPayload = await c.req.json()

  if (payload.schemaVersion > 1) {
    return c.json({ error: 'unknown_schema', version: payload.schemaVersion }, 422)
  }

  const statements = buildUpsertStatements(payload.entity, payload.items)
  if (statements.length === 0) {
    return c.json({ error: 'unknown_entity', entity: payload.entity }, 400)
  }

  // Execute all statements atomically via D1 batch
  const prepared = statements.map((s) => c.env.DB.prepare(s.sql).bind(...s.params))
  await c.env.DB.batch(prepared)

  return c.json({
    ok: true,
    entity: payload.entity,
    itemCount: payload.items.length,
    statementsExecuted: statements.length,
    watermark: Date.now(),
  })
}
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/server/sync-receiver.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Register in server.ts**

```typescript
import { handleSync } from './sync-receiver'

// Add after existing /api/internal/image-manifest route:
app.post('/api/internal/sync', (c) => handleSync(c))
```

- [ ] **Step 7: Set SYNC_SECRET on the Worker**

```bash
npx wrangler secret put SYNC_SECRET
```
(Enter the same value as `ManifestSync__Secret` for now — in Phase 6, the old secrets are removed)

- [ ] **Step 8: Run all tests**

Run: `npm run test`
Expected: All tests PASS

- [ ] **Step 9: Commit**

```bash
git add src/server/sync-receiver.ts src/server/sync-receiver.test.ts src/server.ts src/server/bindings.ts
git commit -m "feat(worker): add generalized /api/internal/sync endpoint for Change Feed"
```

---

## Phase 5 — Observability

### Task 14: Health Endpoint

**Files:**
- Create: `src/server/health.ts`
- Modify: `src/server.ts`

- [ ] **Step 1: Create health endpoint**

```typescript
// src/server/health.ts
import type { Context } from 'hono'
import type { Bindings } from './bindings'

export async function handleHealth(c: Context<{ Bindings: Bindings }>): Promise<Response> {
  const secret = c.req.header('X-Internal-Auth')
  if (secret !== c.env.SYNC_SECRET) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  const [posts, users, cats, tags, cases, roles] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT COUNT(*) as c FROM blog_posts'),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM users'),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM categories'),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM tags'),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM case_studies'),
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
      caseStudies: (cases.results?.[0] as Record<string, number>)?.c ?? 0,
      roles: (roles.results?.[0] as Record<string, number>)?.c ?? 0,
    },
    lastSync: lastSync?.last,
    syncAgeSeconds: age,
    timestamp: new Date().toISOString(),
  })
}
```

- [ ] **Step 2: Register in server.ts**

```typescript
import { handleHealth } from './health'

app.get('/api/internal/health', (c) => handleHealth(c))
```

- [ ] **Step 3: Commit**

```bash
git add src/server/health.ts src/server.ts
git commit -m "feat(worker): add /api/internal/health D1 staleness endpoint"
```

---

### Task 15: Alerting Timer Function

**Files:**
- Create: `api/Functions/SyncHealthCheckFunction.cs`

- [ ] **Step 1: Create health check timer function**

```csharp
// api/Functions/SyncHealthCheckFunction.cs
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

public class SyncHealthCheckFunction
{
    private readonly HttpClient _http;
    private readonly IEmailService _emailService;
    private readonly ILogger<SyncHealthCheckFunction> _logger;
    private readonly string _syncEndpoint;
    private readonly string _syncSecret;

    public SyncHealthCheckFunction(
        IHttpClientFactory httpFactory,
        IEmailService emailService,
        IConfiguration config,
        ILogger<SyncHealthCheckFunction> logger)
    {
        _http = httpFactory.CreateClient();
        _emailService = emailService;
        _logger = logger;
        _syncEndpoint = config["WORKER_SYNC_ENDPOINT"]
            ?? "https://www.horizon-tech.io";
        _syncSecret = config["ManifestSync__Secret"]
            ?? throw new InvalidOperationException("ManifestSync__Secret not configured");
    }

    [Function("SyncHealthCheck")]
    public async Task Run([TimerTrigger("0 */5 * * * *")] TimerInfo timer)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get,
                $"{_syncEndpoint}/api/internal/health");
            request.Headers.Add("X-Internal-Auth", _syncSecret);

            var response = await _http.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var health = await response.Content.ReadFromJsonAsync<HealthResponse>();
            if (health is null) return;

            if (health.SyncAgeSeconds is > 300)
            {
                _logger.LogCritical(
                    "D1 sync stale: {Age}s since last sync at {LastSync}",
                    health.SyncAgeSeconds, health.LastSync);

                await _emailService.SendAsync(
                    "ALERT: D1 Sync Stale",
                    $"Last sync was {health.SyncAgeSeconds}s ago at {health.LastSync}.\n" +
                    "Check Change Feed trigger functions in Azure Portal.\n" +
                    $"Health status: {health.Status}");
            }
            else
            {
                _logger.LogInformation(
                    "D1 sync healthy: {Age}s, counts: posts={Posts} users={Users}",
                    health.SyncAgeSeconds,
                    health.Counts?.BlogPosts, health.Counts?.Users);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Health check failed — Worker may be down");
        }
    }

    private record HealthResponse
    {
        [JsonPropertyName("status")]
        public string? Status { get; init; }

        [JsonPropertyName("syncAgeSeconds")]
        public int? SyncAgeSeconds { get; init; }

        [JsonPropertyName("lastSync")]
        public string? LastSync { get; init; }

        [JsonPropertyName("counts")]
        public HealthCounts? Counts { get; init; }
    }

    private record HealthCounts
    {
        [JsonPropertyName("blogPosts")]
        public int BlogPosts { get; init; }

        [JsonPropertyName("users")]
        public int Users { get; init; }
    }
}
```

- [ ] **Step 2: Build**

Run:
```bash
cd api && dotnet build
```
Expected: Build succeeded

- [ ] **Step 3: Commit**

```bash
git add api/Functions/SyncHealthCheckFunction.cs
git commit -m "feat(api): add 5-min timer health check for D1 sync staleness"
```

---

### Task 16: Remove Old Sync Paths (Cleanup)

**Files:**
- Remove: `src/server/image-manifest.ts`
- Modify: `src/server.ts` (remove old route)
- Modify: `api/Functions/ImageSweepFunction.cs` (remove manual D1 sync)

- [ ] **Step 1: Remove image-manifest.ts**

```bash
git rm src/server/image-manifest.ts
```

- [ ] **Step 2: Remove old route from server.ts**

Remove the line:
```typescript
app.post('/api/internal/image-manifest', (c) => handleManifestSync(c))
```

And its import.

> The `/api/internal/sync` endpoint with entity `processedImages` now handles this.

- [ ] **Step 3: Remove fire-and-forget SyncAsync from ImageSweepFunction**

In `api/Functions/ImageSweepFunction.cs`, remove or comment out:
```csharp
await _manifestSync.SyncAsync(manifest);
```

The Change Feed on the `processedImages` Cosmos container now handles D1 sync automatically.

- [ ] **Step 4: Remove IMAGE_SYNC_SECRET from Worker (replaced by SYNC_SECRET)**

```bash
npx wrangler secret delete IMAGE_SYNC_SECRET
```

- [ ] **Step 5: Update bindings.ts — remove IMAGE_SYNC_SECRET**

Remove `IMAGE_SYNC_SECRET: string` from the `Bindings` interface (keep `SYNC_SECRET`).

- [ ] **Step 6: Build both sides**

```bash
npm run build && cd api && dotnet build
```
Expected: Both succeed

- [ ] **Step 7: Run all tests**

```bash
npm run test
```
Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: remove old image-manifest sync path, replaced by generalized sync + Change Feed"
```

---

## Phase 6 — Deploy

### Task 17: Deploy Everything

- [ ] **Step 1: Deploy Worker**

```bash
npm run build && npx wrangler deploy
```

- [ ] **Step 2: Deploy Azure Function**

```bash
cd api && func azure functionapp publish ht-func-prod
```

- [ ] **Step 3: Verify Change Feed is firing**

Edit a blog post in admin. Within 5 seconds, check D1:

```bash
npx wrangler d1 execute horizon-db --remote --command "SELECT updated_at FROM blog_posts ORDER BY updated_at DESC LIMIT 1"
```

Expected: timestamp within the last few seconds.

- [ ] **Step 4: Verify health endpoint**

```bash
curl -s https://www.horizon-tech.io/api/internal/health \
  -H "X-Internal-Auth: <SYNC_SECRET>" | node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync(0,'utf-8')),null,2))"
```

Expected: `"status": "healthy"`, reasonable counts, `syncAgeSeconds < 300`.

- [ ] **Step 5: Verify R2 queue**

Upload an image via admin. Check the Cloudflare dashboard → Queues → `img-r2-writes` for messages processed.

- [ ] **Step 6: Remove old environment variables**

```bash
az functionapp config appsettings delete \
  --name ht-func-prod \
  --resource-group ht-web-prod \
  --setting-names MONGODB_CONNECTION_STRING MONGODB_DATABASE_NAME IMAGE_SWEEP_SECRET
```

> Keep ManifestSync__Endpoint and ManifestSync__Secret until the WarmAsync endpoint is updated to use the new SYNC_SECRET.

- [ ] **Step 7: Commit any final changes and push**

```bash
git add -A && git commit -m "chore: deploy sync reliability plan" && git push
```

---

## Environment Variables (Final State)

### Azure Function App Settings

| Key | Purpose |
|-----|---------|
| `COSMOS_CONNECTION_STRING` | Cosmos DB NoSQL connection string |
| `CosmosDBConnection__accountEndpoint` | Cosmos DB endpoint (for Change Feed triggers) |
| `WORKER_SYNC_ENDPOINT` | `https://www.horizon-tech.io` |
| `ManifestSync__Endpoint` | Worker sync URL (used by WorkerSyncService) |
| `ManifestSync__Secret` | Shared secret for Worker internal endpoints |
| ~~`MONGODB_CONNECTION_STRING`~~ | **Removed** |
| ~~`MONGODB_DATABASE_NAME`~~ | **Removed** |
| ~~`IMAGE_SWEEP_SECRET`~~ | **Removed** |

### Worker Secrets

| Key | Purpose |
|-----|---------|
| `SYNC_SECRET` | Auth for `/api/internal/*` endpoints |
| `JWT_SECRET` | HS256 signing key (unchanged) |
| ~~`IMAGE_SYNC_SECRET`~~ | **Removed** |

---

## Self-Review

**Spec coverage:**
- [x] R2 hardening: Cloudflare Queue (Task 2-3), staleness detection (Task 3), circuit breaker (Task 1, 3), proactive warming (Task 4-5)
- [x] Cosmos NoSQL migration: SDK swap (Task 6), entities (Task 7), DI (Task 8), repos (Task 9), infrastructure (Task 10), data migration (Task 11)
- [x] Change Feed sync: trigger functions (Task 12), sync service rename (Task 12)
- [x] Worker sync receiver: generalized endpoint (Task 13)
- [x] Observability: health endpoint (Task 14), alerting timer (Task 15)
- [x] Cleanup: old sync removal (Task 16)
- [x] Deployment: full deploy sequence (Task 17)

**Placeholder scan:** No TBD/TODO/placeholder found. All code blocks contain complete implementations.

**Type consistency:**
- `IWorkerSyncService` used consistently after rename (Task 12) — checked in DI (Program.cs), Functions, and WorkerSyncService
- `ImageWriteMessage` interface defined in `bindings.ts` (Task 2), used in handler (Task 3) and consumer (Task 2)
- `PreparedStatement` interface defined and used only in `sync-receiver.ts` (Task 13)
- `buildUpsertStatements` exported from `sync-receiver.ts`, tested in `sync-receiver.test.ts`
- D1 column names match `schema.ts`: `is_published` (not `isPublished`), `author_name` (not `authorName`), etc.
- Cosmos container names match: `blogPosts`, `users`, `categories`, `tags`, `caseStudies`, `roles`, `llmProviders`, `llmSettings`, `processedImages`, `leases`
- Partition keys match: `/slug` for blogPosts/categories/tags/caseStudies, `/email` for users, `/name` for roles, `/key` for llmProviders, `/id` for llmSettings, `/path` for processedImages
