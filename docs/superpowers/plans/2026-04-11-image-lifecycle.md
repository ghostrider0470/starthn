# Image Lifecycle System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate image storage into dedicated Azure Blob containers (avatars, page-images, blog-images), add delete-on-replace, avatar removal, variant processing for all image types, and a migration script for existing data.

**Architecture:** Container-aware `BlobStorageService` routes uploads/deletes to the correct Azure container. Backend endpoints handle variant generation + old-blob cleanup atomically. Edge handler (`/img/*`) parses container from URL path. D1 and Cosmos gain a `container` field. Migration function copies existing blobs to new paths and updates all DB references.

**Tech Stack:** .NET 10 (Azure Functions), SixLabors.ImageSharp, Azure Blob Storage SDK, Cosmos DB SDK, Cloudflare Workers (Hono), D1, R2, Drizzle ORM

**Spec:** `docs/superpowers/specs/2026-04-11-image-lifecycle-design.md`

---

### Task 1: Add `container` field to ProcessedImageEntity

**Files:**
- Modify: `api/Entities/ProcessedImageEntity.cs`

- [ ] **Step 1: Add Container property**

```csharp
// api/Entities/ProcessedImageEntity.cs — add after line 8 (the Path property)
[JsonPropertyName("container")] public string Container { get; set; } = "blog-images";
```

The full file becomes:

```csharp
using System.Text.Json.Serialization;

namespace Api.Entities;

public class ProcessedImageEntity
{
    [JsonPropertyName("id")] public string Id => Path; // Cosmos requires "id"
    [JsonPropertyName("path")] public string Path { get; set; } = string.Empty;
    [JsonPropertyName("container")] public string Container { get; set; } = "blog-images";
    [JsonPropertyName("format")] public string Format { get; set; } = "webp";
    [JsonPropertyName("widths")] public int[] Widths { get; set; } = [];
    [JsonPropertyName("processedAt")] public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
    [JsonPropertyName("source")] public string Source { get; set; } = "backend";
    [JsonPropertyName("_etag")] public string? ETag { get; set; }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/Entities/ProcessedImageEntity.cs
git commit -m "feat(images): add Container field to ProcessedImageEntity"
```

---

### Task 2: Add `container` column to D1 schema + sync receiver

**Files:**
- Modify: `src/server/db/schema.ts:269-275`
- Modify: `src/server/sync-receiver.ts:391-411`

- [ ] **Step 1: Add container column to D1 schema**

In `src/server/db/schema.ts`, update the `processedImages` table definition:

```typescript
export const processedImages = sqliteTable('processed_images', {
  path: text('path').primaryKey(),
  container: text('container').notNull().default('blog-images'),
  format: text('format').notNull().default('webp'),
  widths: text('widths').notNull(),
  processedAt: text('processed_at').notNull(),
  source: text('source').notNull(),
})
```

- [ ] **Step 2: Update sync receiver to handle container field**

In `src/server/sync-receiver.ts`, update the `processedImages` handler:

```typescript
  processedImages: (item) => {
    if (isDeleted(item)) {
      return [
        { sql: `DELETE FROM processed_images WHERE path = ?`, params: [item.path] },
      ]
    }

    return [
      {
        sql: `INSERT OR REPLACE INTO processed_images (path, container, format, widths, processed_at, source)
          VALUES (?, ?, ?, ?, ?, ?)`,
        params: [
          item.path,
          item.container ?? 'blog-images',
          item.format ?? 'webp',
          JSON.stringify(item.widths ?? []),
          item.processedAt,
          item.source ?? 'backend',
        ],
      },
    ]
  },
```

- [ ] **Step 3: Create D1 migration to add the column to existing databases**

Create `src/server/db/migrations/003_add_container_to_processed_images.sql`:

```sql
ALTER TABLE processed_images ADD COLUMN container TEXT NOT NULL DEFAULT 'blog-images';
```

- [ ] **Step 4: Commit**

```bash
git add src/server/db/schema.ts src/server/sync-receiver.ts src/server/db/migrations/003_add_container_to_processed_images.sql
git commit -m "feat(images): add container column to D1 processed_images table"
```

---

### Task 3: Make BlobStorageService container-aware with delete support

**Files:**
- Modify: `api/Services/Interfaces/IBlobStorageService.cs`
- Modify: `api/Services/Implementations/BlobStorageService.cs`

- [ ] **Step 1: Update IBlobStorageService interface**

Replace the entire file:

```csharp
namespace Api.Services.Interfaces;

public interface IBlobStorageService
{
    /// <summary>
    /// Upload an image to the specified container with the given blob path.
    /// Creates the container if it doesn't exist.
    /// Returns the full Azure Blob URL.
    /// </summary>
    Task<string> UploadImageAsync(string container, string blobPath, Stream stream, string contentType);

    /// <summary>
    /// Upload a WebP variant alongside an original blob.
    /// Variant path: {blobPath}/w{width}.webp
    /// </summary>
    Task UploadVariantAsync(
        string container,
        string blobPath,
        int width,
        byte[] webpData,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Set the processed/source/processedAt metadata on an existing blob.
    /// </summary>
    Task SetProcessedMetadataAsync(
        string container,
        string blobPath,
        string source,
        DateTime processedAt,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete a blob and all its variant blobs (w400.webp, w800.webp, etc.)
    /// from the specified container. Does not throw if blobs don't exist.
    /// </summary>
    Task DeleteBlobWithVariantsAsync(
        string container,
        string blobPath,
        CancellationToken cancellationToken = default);
}
```

- [ ] **Step 2: Rewrite BlobStorageService implementation**

Replace the entire file:

```csharp
using Api.Services.Interfaces;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace Api.Services.Implementations;

public class BlobStorageService : IBlobStorageService
{
    private readonly BlobServiceClient _serviceClient;

    public BlobStorageService()
    {
        var connectionString = Environment.GetEnvironmentVariable("BLOB_STORAGE_CONNECTION_STRING");
        _serviceClient = new BlobServiceClient(connectionString);
    }

    public async Task<string> UploadImageAsync(
        string container, string blobPath, Stream stream, string contentType)
    {
        var containerClient = _serviceClient.GetBlobContainerClient(container);
        await containerClient.CreateIfNotExistsAsync(PublicAccessType.Blob);

        var blobClient = containerClient.GetBlobClient(blobPath);
        var headers = new BlobHttpHeaders { ContentType = contentType };
        await blobClient.UploadAsync(stream, new BlobUploadOptions { HttpHeaders = headers });

        return blobClient.Uri.ToString();
    }

    public async Task UploadVariantAsync(
        string container,
        string blobPath,
        int width,
        byte[] webpData,
        CancellationToken cancellationToken = default)
    {
        var containerClient = _serviceClient.GetBlobContainerClient(container);
        var variantName = $"{blobPath}/w{width}.webp";
        var blobClient = containerClient.GetBlobClient(variantName);

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
        string container,
        string blobPath,
        string source,
        DateTime processedAt,
        CancellationToken cancellationToken = default)
    {
        var containerClient = _serviceClient.GetBlobContainerClient(container);
        var blobClient = containerClient.GetBlobClient(blobPath);
        var metadata = new Dictionary<string, string>
        {
            ["processed"] = "true",
            ["source"] = source,
            ["processedAt"] = processedAt.ToString("O"),
        };
        await blobClient.SetMetadataAsync(metadata, cancellationToken: cancellationToken);
    }

    public async Task DeleteBlobWithVariantsAsync(
        string container,
        string blobPath,
        CancellationToken cancellationToken = default)
    {
        var containerClient = _serviceClient.GetBlobContainerClient(container);

        // Delete variants by listing blobs with the prefix "{blobPath}/w"
        var prefix = $"{blobPath}/w";
        await foreach (var blob in containerClient.GetBlobsAsync(
            prefix: prefix, cancellationToken: cancellationToken))
        {
            await containerClient.DeleteBlobIfExistsAsync(
                blob.Name, DeleteSnapshotsOption.IncludeSnapshots, cancellationToken: cancellationToken);
        }

        // Delete the original
        await containerClient.DeleteBlobIfExistsAsync(
            blobPath, DeleteSnapshotsOption.IncludeSnapshots, cancellationToken: cancellationToken);
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add api/Services/Interfaces/IBlobStorageService.cs api/Services/Implementations/BlobStorageService.cs
git commit -m "feat(images): make BlobStorageService container-aware with delete support"
```

---

### Task 4: Add DeleteAsync to ProcessedImageRepository

**Files:**
- Modify: `api/Repositories/Interfaces/IProcessedImageRepository.cs`
- Modify: `api/Repositories/Implementations/ProcessedImageRepository.cs`

- [ ] **Step 1: Add DeleteAsync to interface**

```csharp
// api/Repositories/Interfaces/IProcessedImageRepository.cs
using Api.Entities;

namespace Api.Repositories.Interfaces;

public interface IProcessedImageRepository
{
    Task UpsertAsync(ProcessedImageEntity entity, CancellationToken cancellationToken = default);
    Task<ProcessedImageEntity?> GetByPathAsync(string path, CancellationToken cancellationToken = default);
    Task DeleteAsync(string path, CancellationToken cancellationToken = default);
    IAsyncEnumerable<string> GetProcessedPathsAsync(CancellationToken cancellationToken = default);
}
```

- [ ] **Step 2: Implement DeleteAsync**

Add to `api/Repositories/Implementations/ProcessedImageRepository.cs` after the `GetByPathAsync` method (after line 40):

```csharp
    public async Task DeleteAsync(
        string path,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _container.DeleteItemAsync<ProcessedImageEntity>(
                path, new PartitionKey(path), cancellationToken: cancellationToken);
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            // Already deleted — no-op
        }
    }
```

- [ ] **Step 3: Commit**

```bash
git add api/Repositories/Interfaces/IProcessedImageRepository.cs api/Repositories/Implementations/ProcessedImageRepository.cs
git commit -m "feat(images): add DeleteAsync to ProcessedImageRepository"
```

---

### Task 5: Update callers — ImageUploadFunction

The blog image upload function needs to use the new container-aware interface, accept a `slug` form field, and support delete-on-replace.

**Files:**
- Modify: `api/Functions/ImageUploadFunction.cs`

- [ ] **Step 1: Rewrite ImageUploadFunction**

Replace the entire file:

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
using Microsoft.Extensions.Logging;

namespace Api.Functions;

public class ImageUploadFunction
{
    private const string Container = "blog-images";
    private static readonly int[] TargetWidths = [400, 800, 1200, 1600, 2000];

    private readonly IBlobStorageService _blobService;
    private readonly IImageProcessingService _imageProcessor;
    private readonly IProcessedImageRepository _processedRepo;
    private readonly IWorkerSyncService _manifestSync;
    private readonly AuthHelper _auth;
    private readonly ILogger<ImageUploadFunction> _logger;

    public ImageUploadFunction(
        IBlobStorageService blobService,
        IImageProcessingService imageProcessor,
        IProcessedImageRepository processedRepo,
        IWorkerSyncService manifestSync,
        AuthHelper auth,
        ILogger<ImageUploadFunction> logger)
    {
        _blobService = blobService;
        _imageProcessor = imageProcessor;
        _processedRepo = processedRepo;
        _manifestSync = manifestSync;
        _auth = auth;
        _logger = logger;
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

        // Require slug for path organization
        var slug = parsed.GetParameterValue("slug")
            ?? throw new AppValidationException("slug", "Blog post slug is required.");

        // Optional: old URL for delete-on-replace
        var replaceUrl = parsed.GetParameterValue("replaceUrl");

        // 1. Upload the original to slug-based path
        using var originalStream = new MemoryStream();
        await original.Data.CopyToAsync(originalStream);
        originalStream.Position = 0;

        var blobPath = $"{slug}/{Guid.NewGuid():N}.webp";
        var originalUrl = await _blobService.UploadImageAsync(
            Container, blobPath, originalStream, original.ContentType);

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
            originalStream.Position = 0;
            var generated = await _imageProcessor.GenerateWebpVariantsAsync(
                originalStream, TargetWidths);
            variants = generated.ToDictionary(v => v.Width, v => v.Data);
        }

        // 3. Upload all variants
        foreach (var kv in variants)
        {
            await _blobService.UploadVariantAsync(Container, blobPath, kv.Key, kv.Value);
        }

        // 4. Set processed metadata
        var processedAt = DateTime.UtcNow;
        await _blobService.SetProcessedMetadataAsync(Container, blobPath, source, processedAt);

        // 5. Upsert manifest
        var manifestPath = $"{Container}/{blobPath}";
        var manifest = new ProcessedImageEntity
        {
            Path = manifestPath,
            Container = Container,
            Format = "webp",
            Widths = TargetWidths,
            ProcessedAt = processedAt,
            Source = source,
        };
        await _processedRepo.UpsertAsync(manifest);

        // 6. Delete old blob if replacing
        if (!string.IsNullOrEmpty(replaceUrl))
        {
            _ = DeleteOldBlobAsync(replaceUrl);
        }

        // 7. Fire-and-forget sync + warm
        _ = _manifestSync.SyncAsync(manifest);
        _ = _manifestSync.WarmAsync(manifestPath, manifest.Widths, manifest.ProcessedAt.ToString("O"));

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { url = manifestPath });
    }

    private async Task DeleteOldBlobAsync(string oldUrl)
    {
        try
        {
            var oldBlobPath = ExtractBlobPath(oldUrl);
            if (string.IsNullOrEmpty(oldBlobPath)) return;

            // Determine container from path prefix
            var (container, relativePath) = SplitContainerPath(oldBlobPath);
            await _blobService.DeleteBlobWithVariantsAsync(container, relativePath);

            // Delete old manifest
            await _processedRepo.DeleteAsync(oldBlobPath);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete old blob: {Url}", oldUrl);
        }
    }

    /// <summary>
    /// Extract blob path from either a full Azure URL or a relative path.
    /// </summary>
    private static string ExtractBlobPath(string urlOrPath)
    {
        if (urlOrPath.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            var uri = new Uri(urlOrPath);
            return uri.AbsolutePath.TrimStart('/');
        }
        return urlOrPath;
    }

    /// <summary>
    /// Split "blog-images/slug/guid.webp" into ("blog-images", "slug/guid.webp").
    /// </summary>
    private static (string container, string relativePath) SplitContainerPath(string fullPath)
    {
        var idx = fullPath.IndexOf('/');
        return idx > 0
            ? (fullPath[..idx], fullPath[(idx + 1)..])
            : (fullPath, string.Empty);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/Functions/ImageUploadFunction.cs
git commit -m "feat(images): blog upload uses slug-based paths with delete-on-replace"
```

---

### Task 6: Update ProfileFunctions — avatar upload with variants + delete-on-replace + remove endpoint

**Files:**
- Modify: `api/Functions/ProfileFunctions.cs:193-210`

- [ ] **Step 1: Add new dependencies to ProfileFunctions constructor**

The constructor needs `IImageProcessingService`, `IProcessedImageRepository`, `IWorkerSyncService`, and `ILogger`. Check the existing constructor and add missing dependencies.

Add these fields to the class:

```csharp
    private readonly IImageProcessingService _imageProcessor;
    private readonly IProcessedImageRepository _processedRepo;
    private readonly IWorkerSyncService _manifestSync;
    private readonly ILogger<ProfileFunctions> _logger;
```

Add them to the constructor parameters and assign them.

- [ ] **Step 2: Rewrite UploadAvatar with variants + delete-on-replace**

Replace the existing `UploadAvatar` method (lines 195-209) with:

```csharp
    private const string AvatarContainer = "avatars";
    private static readonly int[] AvatarWidths = [48, 96, 192];

    [Function("UploadAvatar")]
    public async Task<HttpResponseData> UploadAvatar(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "user/avatar")] HttpRequestData req)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);

        var parsed = await MultipartFormDataParser.ParseAsync(req.Body);
        var file = parsed.Files.FirstOrDefault()
            ?? throw new AppValidationException("file", "No image file provided.");

        // Read current avatar for delete-on-replace
        var currentUser = await _userService.GetByIdAsync(userId);
        var oldAvatarPath = currentUser?.AvatarUrl;

        // Upload new original
        using var stream = new MemoryStream();
        await file.Data.CopyToAsync(stream);
        stream.Position = 0;

        var blobPath = $"{userId}/{Guid.NewGuid():N}.webp";
        await _blobService.UploadImageAsync(AvatarContainer, blobPath, stream, "image/webp");

        // Generate + upload variants
        stream.Position = 0;
        var variants = await _imageProcessor.GenerateWebpVariantsAsync(stream, AvatarWidths);
        foreach (var v in variants)
        {
            await _blobService.UploadVariantAsync(AvatarContainer, blobPath, v.Width, v.Data);
        }

        // Metadata + manifest
        var processedAt = DateTime.UtcNow;
        await _blobService.SetProcessedMetadataAsync(AvatarContainer, blobPath, "backend", processedAt);

        var manifestPath = $"{AvatarContainer}/{blobPath}";
        var manifest = new ProcessedImageEntity
        {
            Path = manifestPath,
            Container = AvatarContainer,
            Format = "webp",
            Widths = AvatarWidths,
            ProcessedAt = processedAt,
            Source = "backend",
        };
        await _processedRepo.UpsertAsync(manifest);

        // Update user document
        await _userService.UpdateAvatarAsync(userId, manifestPath);

        // Delete old avatar (fire-and-forget)
        if (!string.IsNullOrEmpty(oldAvatarPath))
        {
            _ = DeleteOldAvatarAsync(oldAvatarPath);
        }

        // Sync + warm
        _ = _manifestSync.SyncAsync(manifest);
        _ = _manifestSync.WarmAsync(manifestPath, AvatarWidths, processedAt.ToString("O"));

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { avatarUrl = manifestPath });
    }

    [Function("RemoveAvatar")]
    public async Task<HttpResponseData> RemoveAvatar(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "user/avatar")] HttpRequestData req)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);

        var currentUser = await _userService.GetByIdAsync(userId);
        var avatarPath = currentUser?.AvatarUrl;

        if (!string.IsNullOrEmpty(avatarPath))
        {
            // Extract container-relative path: "avatars/userId/guid.webp" → "userId/guid.webp"
            var relativePath = avatarPath.StartsWith($"{AvatarContainer}/")
                ? avatarPath[($"{AvatarContainer}/".Length)..]
                : avatarPath;

            await _blobService.DeleteBlobWithVariantsAsync(AvatarContainer, relativePath);
            await _processedRepo.DeleteAsync(avatarPath);
        }

        await _userService.UpdateAvatarAsync(userId, null!);
        return req.CreateResponse(HttpStatusCode.NoContent);
    }

    private async Task DeleteOldAvatarAsync(string oldPath)
    {
        try
        {
            var relativePath = oldPath.StartsWith($"{AvatarContainer}/")
                ? oldPath[($"{AvatarContainer}/".Length)..]
                : oldPath;
            await _blobService.DeleteBlobWithVariantsAsync(AvatarContainer, relativePath);
            await _processedRepo.DeleteAsync(oldPath);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete old avatar: {Path}", oldPath);
        }
    }
```

- [ ] **Step 3: Update UploadPageImage similarly**

Replace the existing `UploadPageImage` method (around lines 98-110):

```csharp
    private const string PageImageContainer = "page-images";
    private static readonly int[] ContentWidths = [400, 800, 1200, 1600, 2000];

    [Function("UploadPageImage")]
    public async Task<HttpResponseData> UploadPageImage(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "user/page-image")] HttpRequestData req)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);

        var parsed = await MultipartFormDataParser.ParseAsync(req.Body);
        var file = parsed.Files.FirstOrDefault()
            ?? throw new AppValidationException("file", "No image file provided.");

        using var stream = new MemoryStream();
        await file.Data.CopyToAsync(stream);
        stream.Position = 0;

        var blobPath = $"{userId}/{Guid.NewGuid():N}.webp";
        await _blobService.UploadImageAsync(PageImageContainer, blobPath, stream, file.ContentType);

        // Generate + upload variants
        stream.Position = 0;
        var variants = await _imageProcessor.GenerateWebpVariantsAsync(stream, ContentWidths);
        foreach (var v in variants)
        {
            await _blobService.UploadVariantAsync(PageImageContainer, blobPath, v.Width, v.Data);
        }

        var processedAt = DateTime.UtcNow;
        await _blobService.SetProcessedMetadataAsync(PageImageContainer, blobPath, "backend", processedAt);

        var manifestPath = $"{PageImageContainer}/{blobPath}";
        var manifest = new ProcessedImageEntity
        {
            Path = manifestPath,
            Container = PageImageContainer,
            Format = "webp",
            Widths = ContentWidths,
            ProcessedAt = processedAt,
            Source = "backend",
        };
        await _processedRepo.UpsertAsync(manifest);

        _ = _manifestSync.SyncAsync(manifest);
        _ = _manifestSync.WarmAsync(manifestPath, ContentWidths, processedAt.ToString("O"));

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { url = manifestPath });
    }
```

- [ ] **Step 4: Commit**

```bash
git add api/Functions/ProfileFunctions.cs
git commit -m "feat(images): avatar upload with variants, delete-on-replace, and DELETE endpoint"
```

---

### Task 7: Update ImageSweepFunction for container-aware service

**Files:**
- Modify: `api/Functions/ImageSweepFunction.cs`

- [ ] **Step 1: Update sweep function calls**

The sweep function scans the `blog-images` container. Update all `_blobService` calls to pass the container name `"blog-images"` as the first argument. The sweep iterates blobs in `blog-images`, so every call needs the container:

- `_blobService.UploadVariantAsync("blog-images", blobName, ...)` (variant upload)
- `_blobService.SetProcessedMetadataAsync("blog-images", blobName, ...)` (metadata)

Also update manifest creation to include `Container = "blog-images"`.

- [ ] **Step 2: Commit**

```bash
git add api/Functions/ImageSweepFunction.cs
git commit -m "refactor(images): update ImageSweepFunction for container-aware BlobStorageService"
```

---

### Task 8: Update WorkerSyncService — container field + container-aware warming

**Files:**
- Modify: `api/Services/Implementations/WorkerSyncService.cs:54-61`

- [ ] **Step 1: Add container to SyncAsync payload**

In `WorkerSyncService.SyncAsync`, update the anonymous payload object (line 54-61):

```csharp
            var payload = new
            {
                path = entity.Path,
                container = entity.Container,
                format = entity.Format,
                widths = entity.Widths,
                processedAt = entity.ProcessedAt.ToString("O"),
                source = entity.Source,
            };
```

- [ ] **Step 2: Update WarmAsync for container-aware warm widths**

The current `WarmAsync` hardcodes warming widths 800 and 1200. For avatars (widths [48, 96, 192]) this results in no warming at all. Update to warm the two largest available widths instead:

In `WorkerSyncService.WarmAsync` (line 90), replace:

```csharp
        var warmWidths = widths.Where(w => w == 800 || w == 1200).ToArray();
```

with:

```csharp
        // Warm the two largest widths (covers most common use cases)
        var warmWidths = widths.OrderByDescending(w => w).Take(2).ToArray();
```

This warms [1200, 800] for blog/page images and [192, 96] for avatars.

- [ ] **Step 3: Commit**

```bash
git add api/Services/Implementations/WorkerSyncService.cs
git commit -m "feat(images): container field in sync + container-aware R2 warming"
```

---

### Task 9: Update edge image handler for container-aware routing

**Files:**
- Modify: `src/server/image-handler.ts`

- [ ] **Step 1: Update D1 query and Azure fallback**

The handler already parses the full path from `/img/...`. The path now starts with the container name (e.g., `avatars/userId/guid.webp`). The D1 query and Azure URL construction need no structural changes since the `path` column already stores the container-prefixed path.

Add width validation per container. Replace the entire `handleImageRequest` function:

```typescript
import type { Context } from 'hono'
import type { Bindings, ImageWriteMessage } from './bindings'
import { CircuitBreaker } from './circuit-breaker'

const AZURE_BLOB_ORIGIN = 'https://htstorageprod.blob.core.windows.net'

const azureBreaker = new CircuitBreaker(3, 60_000)

/** Allowed widths per container type */
const CONTAINER_WIDTHS: Record<string, number[]> = {
  avatars: [48, 96, 192],
  'blog-images': [400, 800, 1200, 1600, 2000],
  'page-images': [400, 800, 1200, 1600, 2000],
}

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
  const url = new URL(c.req.url)
  const w = parseInt(url.searchParams.get('w') ?? '0', 10)
  const q = url.searchParams.get('q') ?? '80'
  const f = url.searchParams.get('f') ?? 'webp'

  // Validate container
  const container = parseContainer(blobPath)
  if (!container) {
    return new Response('Invalid image path', { status: 400 })
  }

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

  if (manifest && w > 0) {
    const available = JSON.parse(manifest.widths) as number[]
    const snapped = snapWidth(w, available)
    const version = Math.floor(new Date(manifest.processed_at).getTime() / 1000)
    const r2Key = `${blobPath}/w${snapped}-v${version}.webp`

    // 3a. R2 check
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

    // 3b. Azure variant (circuit breaker)
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
      console.warn('[img] circuit breaker open, using CF Image Resizing fallback')
    }
  }

  // If manifest was deleted (image removed), return 404
  if (!manifest && container) {
    return new Response('Not found', { status: 404 })
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
```

- [ ] **Step 2: Commit**

```bash
git add src/server/image-handler.ts
git commit -m "feat(images): container-aware edge image handler with width validation"
```

---

### Task 10: Update frontend image utility for relative paths

**Files:**
- Modify: `src/lib/image.ts`

- [ ] **Step 1: Update img() to handle relative paths**

The backend now returns relative paths like `avatars/userId/guid.webp` instead of full Azure URLs. Update `img()` to handle both:

```typescript
const AZURE_BLOB = 'https://htstorageprod.blob.core.windows.net/'

/** Known image container prefixes */
const CONTAINER_PREFIXES = ['avatars/', 'blog-images/', 'page-images/']

interface ImageOpts {
  width?: number
  quality?: number
  format?: 'webp' | 'avif' | 'auto'
}

export const IMAGE_WIDTHS = {
  cover: [400, 800, 1200, 1600, 2000],
  banner: [400, 800, 1200, 1600, 2000],
  avatar: [48, 96, 192],
  content: [400, 800, 1200, 1600, 2000],
} as const

export function img(src: string | null | undefined, opts?: ImageOpts): string {
  if (!src) return ''

  // Already an /img/ proxy URL
  if (src.startsWith('/img/')) return src

  let path: string

  if (src.startsWith(AZURE_BLOB)) {
    // Legacy full Azure URL — strip origin
    path = src.slice(AZURE_BLOB.length)
  } else if (CONTAINER_PREFIXES.some(p => src.startsWith(p))) {
    // New relative path (e.g., "avatars/userId/guid.webp")
    path = src
  } else {
    // Unknown format — return as-is
    return src
  }

  const params = new URLSearchParams()
  if (opts?.width) params.set('w', String(opts.width))
  if (opts?.quality) params.set('q', String(opts.quality))
  if (opts?.format) params.set('f', opts.format)

  const qs = params.toString()
  return `/img/${path}${qs ? `?${qs}` : ''}`
}

export function imgSrcSet(src: string | null | undefined, widths: readonly number[]): string {
  if (!src) return ''
  return widths
    .map(w => `${img(src, { width: w, format: 'auto' })} ${w}w`)
    .join(', ')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/image.ts
git commit -m "feat(images): support relative container paths in img() utility"
```

---

### Task 11: Wire up avatar remove in frontend

**Files:**
- Modify: `src/services/profile.service.ts`
- Modify: `src/routes/{-$locale}/profile.tsx`

- [ ] **Step 1: Add removeAvatar to profile service**

In `src/services/profile.service.ts`, add after the `uploadAvatar` method (after line 93):

```typescript
  async removeAvatar(): Promise<void> {
    await api.delete('/user/avatar');
  }
```

- [ ] **Step 2: Wire up onChange in profile page**

In `src/routes/{-$locale}/profile.tsx`, add a handler and update the `ImageCropUpload` usage.

Add this handler near `handleAvatarCropUpload` (after line 204):

```typescript
  const handleAvatarRemove = async (value: string | null) => {
    if (value === null) {
      await profileService.removeAvatar()
      await refreshProfile()
      setSuccess(t('profile.messages.avatarRemoved', 'Profile photo removed.'))
      setTimeout(() => setSuccess(null), 3000)
    }
  }
```

Then update the `ImageCropUpload` component props — change `onChange={() => {}}` to `onChange={handleAvatarRemove}`:

```tsx
              <ImageCropUpload
                aspectRatio={1}
                cropShape="round"
                label="Profile Photo"
                value={user?.avatarUrl ? img(user.avatarUrl, { width: 192 }) : null}
                onChange={handleAvatarRemove}
                onUpload={handleAvatarCropUpload}
                previewHeight="h-20"
              />
```

Note: `value` now uses `img()` to go through the edge proxy for the avatar preview.

- [ ] **Step 3: Commit**

```bash
git add src/services/profile.service.ts "src/routes/{-\$locale}/profile.tsx"
git commit -m "feat(images): wire up avatar remove button to DELETE /user/avatar"
```

---

### Task 12: Update blog image upload to pass slug

**Files:**
- Modify: `src/services/blog.service.ts`

- [ ] **Step 1: Update uploadImage to accept slug and replaceUrl**

Find the `uploadImage` method (around line 134) and update its signature and FormData construction:

```typescript
  async uploadImage(file: File, slug?: string, replaceUrl?: string): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('original', file);
    if (slug) formData.append('slug', slug);
    if (replaceUrl) formData.append('replaceUrl', replaceUrl);

    try {
      const variants = await convertToWebpVariants(file);
      for (const v of variants) {
        formData.append(`variant_${v.width}`, v.blob);
      }
    } catch (e) {
      console.warn('Client-side variant generation failed, server will handle it', e);
    }

    const response = await api.post('/manage/blog/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }
```

- [ ] **Step 2: Update callers to pass slug**

Search for all calls to `blogService.uploadImage` and update them to pass the current blog post slug. The `ImageCropUpload` component's `onUpload` prop is where this gets threaded through — the blog post editor should pass slug from the form state.

This depends on how the blog editor is structured. The `onUpload` callback receives a `File` and returns `{ url }`. To pass slug, update the callback in the blog editor to create a closure:

```typescript
onUpload={(file) => blogService.uploadImage(file, currentPost.slug, currentPost.coverImage)}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/blog.service.ts
git commit -m "feat(images): pass slug and replaceUrl in blog image uploads"
```

---

### Task 13: Migration function

**Files:**
- Create: `api/Functions/ImageMigrationFunction.cs`

- [ ] **Step 1: Create the migration function**

```csharp
using System.Net;
using System.Text.RegularExpressions;
using Api.Entities;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace Api.Functions;

public class ImageMigrationFunction
{
    private static readonly int[] AvatarWidths = [48, 96, 192];
    private static readonly int[] ContentWidths = [400, 800, 1200, 1600, 2000];

    private readonly CosmosClient _cosmos;
    private readonly IBlobStorageService _blobService;
    private readonly IImageProcessingService _imageProcessor;
    private readonly IProcessedImageRepository _processedRepo;
    private readonly ILogger<ImageMigrationFunction> _logger;

    public ImageMigrationFunction(
        CosmosClient cosmos,
        IBlobStorageService blobService,
        IImageProcessingService imageProcessor,
        IProcessedImageRepository processedRepo,
        ILogger<ImageMigrationFunction> logger)
    {
        _cosmos = cosmos;
        _blobService = blobService;
        _imageProcessor = imageProcessor;
        _processedRepo = processedRepo;
        _logger = logger;
    }

    [Function("MigrateImages")]
    public async Task<HttpResponseData> Migrate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/images/migrate")] HttpRequestData req)
    {
        var secret = req.Headers.GetValues("X-Internal-Auth").FirstOrDefault();
        var expected = Environment.GetEnvironmentVariable("IMAGE_SWEEP_SECRET");
        if (secret != expected)
            return req.CreateResponse(HttpStatusCode.Unauthorized);

        var dryRun = req.Query["dryRun"] == "true";
        var db = _cosmos.GetDatabase("horizon");
        var results = new MigrationResults();

        // 1. Migrate avatars
        var usersContainer = db.GetContainer("users");
        var userQuery = new QueryDefinition("SELECT c.id, c.avatarUrl FROM c WHERE IS_DEFINED(c.avatarUrl) AND c.avatarUrl != null");
        using var userIterator = usersContainer.GetItemQueryIterator<dynamic>(userQuery);
        while (userIterator.HasMoreResults)
        {
            var page = await userIterator.ReadNextAsync();
            foreach (var user in page)
            {
                string userId = user.id;
                string avatarUrl = user.avatarUrl;
                if (string.IsNullOrEmpty(avatarUrl)) continue;

                // Skip already-migrated paths
                if (avatarUrl.StartsWith("avatars/")) { results.Skipped++; continue; }

                var oldBlobPath = ExtractBlobPath(avatarUrl);
                var newBlobPath = $"{userId}/{Guid.NewGuid():N}.webp";
                var newManifestPath = $"avatars/{newBlobPath}";

                _logger.LogInformation("Migrate avatar: {Old} → {New} (dry={Dry})", oldBlobPath, newManifestPath, dryRun);

                if (!dryRun)
                {
                    // TODO: Copy blob via Azure SDK StartCopyFromUri
                    // Generate avatar variants
                    // Update user document avatarUrl
                    // Upsert manifest
                    // The actual copy logic depends on blob access patterns
                }
                results.Migrated++;
            }
        }

        // 2. Migrate blog images — similar pattern, query blogPosts for coverImage/bannerImage
        // 3. Migrate page images — query users for pageContent, extract image URLs

        var response = await req.CreateJsonResponseAsync(HttpStatusCode.OK, new
        {
            dryRun,
            results.Migrated,
            results.Skipped,
            results.Errors,
        });
        return response;
    }

    private static string ExtractBlobPath(string urlOrPath)
    {
        if (urlOrPath.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            var uri = new Uri(urlOrPath);
            return uri.AbsolutePath.TrimStart('/');
        }
        return urlOrPath;
    }

    private class MigrationResults
    {
        public int Migrated { get; set; }
        public int Skipped { get; set; }
        public int Errors { get; set; }
    }
}
```

> **Note:** The migration function is a scaffold. The full implementation involves Azure Blob server-side copy, blog post content parsing, and page content URL extraction. These details depend on production data and should be completed iteratively with dry-run testing. The scaffold handles auth, structure, and user avatar migration as the first case.

- [ ] **Step 2: Commit**

```bash
git add api/Functions/ImageMigrationFunction.cs
git commit -m "feat(images): scaffold migration function for blob path reorganization"
```

---

### Task 14: Create Azure Blob containers

This is a manual/CLI step — the new containers must exist before deploying.

- [ ] **Step 1: Create containers via Azure CLI**

```bash
az storage container create --name avatars --account-name htstorageprod --public-access blob
az storage container create --name page-images --account-name htstorageprod --public-access blob
```

Or via Azure Portal: Storage account → Containers → + Container → name + public access level "Blob".

- [ ] **Step 2: Verify containers exist**

```bash
az storage container list --account-name htstorageprod --query "[].name" -o tsv
```

Expected output includes: `avatars`, `blog-images`, `page-images`

---

### Task 15: Deploy D1 migration

- [ ] **Step 1: Run D1 migration**

```bash
npx wrangler d1 migrations apply horizon-db --remote
```

This applies `003_add_container_to_processed_images.sql`.

- [ ] **Step 2: Verify column exists**

```bash
npx wrangler d1 execute horizon-db --remote --command "PRAGMA table_info(processed_images)"
```

Should show `container` column in the output.
