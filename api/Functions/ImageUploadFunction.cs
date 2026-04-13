using System.Net;
using System.Text.Json;
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
    private static readonly int[] TargetWidths = [400, 800, 1200, 1600, 2000];
    private const string Container = "blog-images";

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

        // 1. Require slug
        var slug = parsed.GetParameterValue("slug");
        if (string.IsNullOrWhiteSpace(slug))
            throw new AppValidationException("slug", "slug is required.");

        // 2. Optional replaceUrl for delete-on-replace
        var replaceUrl = parsed.GetParameterValue("replaceUrl");

        var original = parsed.Files.FirstOrDefault(f => f.Name == "original")
            ?? parsed.Files.FirstOrDefault()
            ?? throw new AppValidationException("file", "No image file provided.");

        // 3. Read original stream
        using var originalStream = new MemoryStream();
        await original.Data.CopyToAsync(originalStream);
        originalStream.Position = 0;

        // 4. Derive slug-based blob path
        var blobPath = $"{slug}/{Guid.NewGuid():N}.webp";

        // 5. Upload original to slug-based path
        await _blobService.UploadImageAsync(Container, blobPath, originalStream, original.ContentType);

        var source = "backend";
        Dictionary<int, byte[]> variants;

        // 6. Check for client-provided variants — accept only if all widths are present
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
            // 7. Backend fallback: run ImageSharp on the original
            originalStream.Position = 0;
            var generated = await _imageProcessor.GenerateWebpVariantsAsync(
                originalStream,
                TargetWidths);
            variants = generated.ToDictionary(v => v.Width, v => v.Data);
        }

        // 8. Upload all variants
        foreach (var kv in variants)
        {
            await _blobService.UploadVariantAsync(Container, blobPath, kv.Key, kv.Value);
        }

        // 9. Set processed metadata on the original blob
        var processedAt = DateTime.UtcNow;
        await _blobService.SetProcessedMetadataAsync(Container, blobPath, source, processedAt);

        // 10. Build manifest path (container-prefixed, what Cosmos/D1 stores)
        var manifestPath = $"{Container}/{blobPath}";

        // 11. Upsert manifest
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

        // 12. Fire-and-forget: delete old blob + old manifest if replacing
        if (!string.IsNullOrWhiteSpace(replaceUrl))
        {
            _ = DeleteOldAsync(replaceUrl);
        }

        // 13. Fire-and-forget sync to Worker D1 cache + R2 warm
        _ = SyncManifestToD1Async(manifest);
        _ = _manifestSync.WarmAsync(
            manifest.Path,
            manifest.Widths,
            manifest.ProcessedAt.ToString("O"));

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { url = manifestPath });
    }

    private async Task DeleteOldAsync(string urlOrPath)
    {
        try
        {
            var oldPath = ExtractBlobPath(urlOrPath);
            var (container, blobPath) = SplitContainerPath(oldPath);
            await _blobService.DeleteBlobWithVariantsAsync(container, blobPath);
            await _processedRepo.DeleteAsync(oldPath);

            // Propagate deletion to D1 via sync endpoint
            var deletePayload = System.Text.Json.JsonSerializer.SerializeToElement(
                new { path = oldPath, _deleted = true });
            _ = _manifestSync.SyncEntityAsync("processedImages", [deletePayload]);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete old image {UrlOrPath} during replace.", urlOrPath);
        }
    }

    /// <summary>
    /// Normalises a full Azure URL or a relative path to a container-prefixed blob path.
    /// e.g. "https://…/blog-images/slug/abc.webp" → "blog-images/slug/abc.webp"
    ///      "blog-images/slug/abc.webp"            → "blog-images/slug/abc.webp"
    /// </summary>
    private static string ExtractBlobPath(string urlOrPath)
    {
        if (Uri.TryCreate(urlOrPath, UriKind.Absolute, out var uri))
        {
            // AbsolutePath: /blog-images/slug/guid.webp  — drop leading slash
            return uri.AbsolutePath.TrimStart('/');
        }

        return urlOrPath.TrimStart('/');
    }

    /// <summary>
    /// Splits "blog-images/slug/guid.webp" into ("blog-images", "slug/guid.webp").
    /// </summary>
    private static (string container, string blobPath) SplitContainerPath(string fullPath)
    {
        var idx = fullPath.IndexOf('/');
        if (idx < 0)
            return (fullPath, string.Empty);
        return (fullPath[..idx], fullPath[(idx + 1)..]);
    }

    private Task SyncManifestToD1Async(ProcessedImageEntity manifest)
    {
        var element = JsonSerializer.SerializeToElement(manifest);
        return _manifestSync.SyncEntityAsync("processedImages", [element]);
    }
}
