using System.Net;
using System.Text.Json;
using Api.Entities;
using Api.Helpers;
using Api.Repositories.Interfaces;
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
    private readonly IWorkerSyncService _manifestSync;
    private readonly IProcessedImageRepository _processedRepo;
    private readonly BlobContainerClient _container;
    private readonly string _sweepSecret;
    private readonly ILogger<ImageSweepFunction> _logger;

    public ImageSweepFunction(
        IBlobStorageService blobService,
        IImageProcessingService imageProcessor,
        IWorkerSyncService manifestSync,
        IProcessedImageRepository processedRepo,
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

        await foreach (var blob in _container.GetBlobsAsync(new GetBlobsOptions { Traits = BlobTraits.Metadata }))
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
            await _blobService.UploadVariantAsync(ContainerName, blobName, v.Width, v.Data);
        }

        var processedAt = DateTime.UtcNow;
        await _blobService.SetProcessedMetadataAsync(
            ContainerName,
            blobName,
            "sweep",
            processedAt);

        var manifest = new ProcessedImageEntity
        {
            Path = $"{ContainerName}/{blobName}",
            Container = ContainerName,
            Format = "webp",
            Widths = TargetWidths,
            ProcessedAt = processedAt,
            Source = "sweep",
        };
        await _processedRepo.UpsertAsync(manifest);

        // Sync manifest to D1 (no Change Feed trigger for processedImages)
        var element = JsonSerializer.SerializeToElement(manifest);
        await _manifestSync.SyncEntityAsync("processedImages", [element]);
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
