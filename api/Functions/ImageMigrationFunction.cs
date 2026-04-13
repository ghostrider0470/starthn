using System.Net;
using System.Text.Json;
using Api.Entities;
using Api.Helpers;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using Azure.Storage.Blobs;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Api.Functions;

public class ImageMigrationFunction
{
    private static readonly int[] AvatarWidths = [48, 96, 192];
    private static readonly int[] BlogImageWidths = [400, 800, 1200];

    private readonly Database _db;
    private readonly IBlobStorageService _blobService;
    private readonly IImageProcessingService _imageProcessor;
    private readonly IProcessedImageRepository _processedRepo;
    private readonly IWorkerSyncService _manifestSync;
    private readonly string _sweepSecret;
    private readonly string _blobConnectionString;
    private readonly ILogger<ImageMigrationFunction> _logger;

    public ImageMigrationFunction(
        Database db,
        IBlobStorageService blobService,
        IImageProcessingService imageProcessor,
        IProcessedImageRepository processedRepo,
        IWorkerSyncService manifestSync,
        IConfiguration config,
        ILogger<ImageMigrationFunction> logger)
    {
        _db = db;
        _blobService = blobService;
        _imageProcessor = imageProcessor;
        _processedRepo = processedRepo;
        _manifestSync = manifestSync;
        _sweepSecret = config["IMAGE_SWEEP_SECRET"]
            ?? throw new InvalidOperationException("IMAGE_SWEEP_SECRET not configured");
        _blobConnectionString = config["BLOB_STORAGE_CONNECTION_STRING"]
            ?? throw new InvalidOperationException("BLOB_STORAGE_CONNECTION_STRING not configured");
        _logger = logger;
    }

    [Function("MigrateImages")]
    public async Task<HttpResponseData> Migrate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/images/migrate")] HttpRequestData req)
    {
        // Auth check — same pattern as ImageSweepFunction
        if (!req.Headers.TryGetValues("X-Internal-Auth", out var auth)
            || auth.FirstOrDefault() != _sweepSecret)
        {
            return req.CreateResponse(HttpStatusCode.Unauthorized);
        }

        var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
        var dryRun = query["dryRun"] == "true";
        var batchSize = int.TryParse(query["batchSize"], out var b) ? b : 50;

        var results = new MigrationResults();

        // Phase 1: Migrate avatars
        await MigrateAvatarsAsync(dryRun, batchSize, results);

        // Phase 2: Migrate blog images (cover + banner)
        await MigrateBlogImagesAsync(dryRun, batchSize, results);

        // Phase 3: Migrate page images (scaffold — to be completed)
        // await MigratePageImagesAsync(dryRun, batchSize, results);

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new
        {
            dryRun,
            results.Migrated,
            results.Skipped,
            results.Errors,
        });
    }

    private async Task MigrateAvatarsAsync(bool dryRun, int batchSize, MigrationResults results)
    {
        var usersContainer = _db.GetContainer("users");
        // Partition key on users is email — need it for PatchItemAsync
        var userQuery = new QueryDefinition(
            "SELECT c.id, c.email, c.avatarUrl FROM c WHERE IS_DEFINED(c.avatarUrl) AND c.avatarUrl != null");

        using var iterator = usersContainer.GetItemQueryIterator<dynamic>(userQuery);
        var count = 0;

        while (iterator.HasMoreResults && count < batchSize)
        {
            var page = await iterator.ReadNextAsync();
            foreach (var user in page)
            {
                if (count >= batchSize) break;

                string userId = user.id;
                string email = user.email;
                string avatarUrl = user.avatarUrl;
                if (string.IsNullOrEmpty(avatarUrl)) continue;

                // Skip already-migrated paths (new format starts with "avatars/")
                if (avatarUrl.StartsWith("avatars/"))
                {
                    results.Skipped++;
                    continue;
                }

                try
                {
                    _logger.LogInformation(
                        "Migrate avatar: user={UserId} old={Old} dryRun={DryRun}",
                        userId, avatarUrl, dryRun);

                    if (!dryRun)
                    {
                        // 1. Locate old blob in blog-images container
                        var oldBlobPath = ExtractRelativePath(avatarUrl); // e.g. "2026/04/guid-file.png"
                        var oldContainerClient = new BlobServiceClient(_blobConnectionString)
                            .GetBlobContainerClient("blog-images");
                        var oldBlob = oldContainerClient.GetBlobClient(oldBlobPath);

                        if (!await oldBlob.ExistsAsync())
                        {
                            _logger.LogWarning("Old blob not found: {Path}", oldBlobPath);
                            results.Errors++;
                            continue;
                        }

                        // 2. Download old blob into memory
                        using var buffer = new MemoryStream();
                        using (var download = await oldBlob.OpenReadAsync())
                        {
                            await download.CopyToAsync(buffer);
                        }
                        buffer.Position = 0;

                        // 3. Convert original to WebP (old blob may be PNG/JPEG)
                        //    Use the largest avatar width as the "original" size
                        var allWidths = new[] { AvatarWidths.Max() };
                        var converted = await _imageProcessor.GenerateWebpVariantsAsync(buffer, allWidths);
                        var webpOriginal = converted[0].Data;

                        var newBlobPath = $"{userId}/{Guid.NewGuid():N}.webp";
                        using var webpStream = new MemoryStream(webpOriginal);
                        await _blobService.UploadImageAsync("avatars", newBlobPath, webpStream, "image/webp");

                        // 4. Generate and upload avatar variants from the original bytes
                        buffer.Position = 0;
                        var variants = await _imageProcessor.GenerateWebpVariantsAsync(buffer, AvatarWidths);
                        foreach (var v in variants)
                            await _blobService.UploadVariantAsync("avatars", newBlobPath, v.Width, v.Data);

                        // 5. Mark blob as processed and create manifest
                        var processedAt = DateTime.UtcNow;
                        await _blobService.SetProcessedMetadataAsync("avatars", newBlobPath, "migration", processedAt);

                        var manifestPath = $"avatars/{newBlobPath}";
                        var manifest = new ProcessedImageEntity
                        {
                            Path = manifestPath,
                            Container = "avatars",
                            Format = "webp",
                            Widths = AvatarWidths,
                            ProcessedAt = processedAt,
                            Source = "migration",
                        };
                        await _processedRepo.UpsertAsync(manifest);

                        // Sync manifest to D1 (no Change Feed trigger for processedImages)
                        var element = JsonSerializer.SerializeToElement(manifest);
                        await _manifestSync.SyncEntityAsync("processedImages", [element]);

                        // 6. Update user document (partition key is email, not userId)
                        await usersContainer.PatchItemAsync<dynamic>(
                            userId,
                            new PartitionKey(email),
                            [PatchOperation.Set("/avatarUrl", manifestPath)]);
                    }

                    results.Migrated++;
                    count++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to migrate avatar for user {UserId}", userId);
                    results.Errors++;
                }
            }
        }
    }

    private async Task MigrateBlogImagesAsync(bool dryRun, int batchSize, MigrationResults results)
    {
        var postsContainer = _db.GetContainer("blogPosts");
        var postQuery = new QueryDefinition(
            "SELECT c.id, c.slug, c.coverImage, c.bannerImage FROM c WHERE " +
            "(IS_DEFINED(c.coverImage) AND c.coverImage != null) OR " +
            "(IS_DEFINED(c.bannerImage) AND c.bannerImage != null)");

        using var iterator = postsContainer.GetItemQueryIterator<dynamic>(postQuery);
        var count = 0;

        while (iterator.HasMoreResults && count < batchSize)
        {
            var page = await iterator.ReadNextAsync();
            foreach (var post in page)
            {
                if (count >= batchSize) break;

                string slug = post.slug;
                string? coverImage = post.coverImage;
                string? bannerImage = post.bannerImage;

                // Skip if both are already migrated (relative paths containing slug)
                var coverNeedsMigration = !string.IsNullOrEmpty(coverImage) && coverImage.StartsWith("http");
                var bannerNeedsMigration = !string.IsNullOrEmpty(bannerImage) && bannerImage.StartsWith("http");

                if (!coverNeedsMigration && !bannerNeedsMigration)
                {
                    results.Skipped++;
                    continue;
                }

                try
                {
                    string? newCoverPath = null;
                    string? newBannerPath = null;

                    if (coverNeedsMigration)
                        newCoverPath = await MigrateSingleBlobAsync(coverImage!, slug, "cover", dryRun);

                    if (bannerNeedsMigration)
                        newBannerPath = await MigrateSingleBlobAsync(bannerImage!, slug, "banner", dryRun);

                    if (!dryRun)
                    {
                        var patches = new List<PatchOperation>();
                        if (newCoverPath != null)
                            patches.Add(PatchOperation.Set("/coverImage", newCoverPath));
                        if (newBannerPath != null)
                            patches.Add(PatchOperation.Set("/bannerImage", newBannerPath));

                        if (patches.Count > 0)
                        {
                            await postsContainer.PatchItemAsync<dynamic>(
                                slug, new PartitionKey(slug), patches);
                        }
                    }

                    results.Migrated++;
                    count++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to migrate blog images for post {Slug}", slug);
                    results.Errors++;
                }
            }
        }
    }

    /// <summary>
    /// Migrates a single blog image blob to slug-based path with WebP conversion + variants.
    /// Returns the new manifest path (e.g. "blog-images/{slug}/cover/{guid}.webp"), or null on failure.
    /// </summary>
    private async Task<string?> MigrateSingleBlobAsync(string oldUrl, string slug, string imageType, bool dryRun)
    {
        var oldBlobPath = ExtractRelativePath(oldUrl);
        _logger.LogInformation(
            "Migrate blog image: slug={Slug} type={Type} old={Old} dryRun={DryRun}",
            slug, imageType, oldBlobPath, dryRun);

        if (dryRun) return $"blog-images/{slug}/{imageType}/dry-run.webp";

        var oldContainerClient = new BlobServiceClient(_blobConnectionString)
            .GetBlobContainerClient("blog-images");
        var oldBlob = oldContainerClient.GetBlobClient(oldBlobPath);

        if (!await oldBlob.ExistsAsync())
        {
            _logger.LogWarning("Old blog image blob not found: {Path}", oldBlobPath);
            return null;
        }

        // Download
        using var buffer = new MemoryStream();
        using (var download = await oldBlob.OpenReadAsync())
            await download.CopyToAsync(buffer);
        buffer.Position = 0;

        // Convert to WebP and upload to new path
        var maxWidth = BlogImageWidths.Max();
        var converted = await _imageProcessor.GenerateWebpVariantsAsync(buffer, [maxWidth]);
        var newBlobPath = $"{slug}/{imageType}/{Guid.NewGuid():N}.webp";

        using var webpStream = new MemoryStream(converted[0].Data);
        await _blobService.UploadImageAsync("blog-images", newBlobPath, webpStream, "image/webp");

        // Generate width variants
        buffer.Position = 0;
        var variants = await _imageProcessor.GenerateWebpVariantsAsync(buffer, BlogImageWidths);
        foreach (var v in variants)
            await _blobService.UploadVariantAsync("blog-images", newBlobPath, v.Width, v.Data);

        // Create manifest
        var processedAt = DateTime.UtcNow;
        await _blobService.SetProcessedMetadataAsync("blog-images", newBlobPath, "migration", processedAt);

        var manifestPath = $"blog-images/{newBlobPath}";
        var manifest = new ProcessedImageEntity
        {
            Path = manifestPath,
            Container = "blog-images",
            Format = "webp",
            Widths = BlogImageWidths,
            ProcessedAt = processedAt,
            Source = "migration",
        };
        await _processedRepo.UpsertAsync(manifest);

        var element = JsonSerializer.SerializeToElement(manifest);
        await _manifestSync.SyncEntityAsync("processedImages", [element]);

        return manifestPath;
    }

    /// <summary>
    /// Extracts the relative blob path from a full Azure Storage URL or returns the input as-is.
    /// "https://htstorageprod.blob.core.windows.net/blog-images/2026/04/abc.png" → "2026/04/abc.png"
    /// </summary>
    private static string ExtractRelativePath(string urlOrPath)
    {
        if (!urlOrPath.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            return urlOrPath;

        var uri = new Uri(urlOrPath);
        // AbsolutePath: /blog-images/2026/04/abc.png — strip the leading container segment
        var path = uri.AbsolutePath.TrimStart('/');
        var slashIdx = path.IndexOf('/');
        return slashIdx > 0 ? path[(slashIdx + 1)..] : path;
    }

    private sealed class MigrationResults
    {
        public int Migrated { get; set; }
        public int Skipped { get; set; }
        public int Errors { get; set; }
    }
}
