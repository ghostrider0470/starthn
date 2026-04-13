using System.Net.Http.Json;
using System.Text.Json;
using Api.Entities;
using Api.Services.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Polly;
using Polly.Retry;

namespace Api.Services.Implementations;

public class WorkerSyncService : IWorkerSyncService
{
    private readonly HttpClient _http;
    private readonly string _endpoint;
    private readonly string _syncEndpoint;
    private readonly string _secret;
    private readonly ILogger<WorkerSyncService> _logger;
    private readonly ResiliencePipeline _retryPipeline;

    public WorkerSyncService(
        HttpClient http,
        IConfiguration config,
        ILogger<WorkerSyncService> logger)
    {
        _http = http;
        _endpoint = config["ManifestSync:Endpoint"]
            ?? throw new InvalidOperationException("ManifestSync:Endpoint not configured");
        _syncEndpoint = config["ManifestSync:SyncEndpoint"]
            ?? _endpoint.Replace("/image-manifest", "/sync");
        _secret = config["ManifestSync:Secret"]
            ?? throw new InvalidOperationException("ManifestSync:Secret not configured");
        _logger = logger;

        _retryPipeline = new ResiliencePipelineBuilder()
            .AddRetry(new RetryStrategyOptions
            {
                MaxRetryAttempts = 3,
                BackoffType = DelayBackoffType.Exponential,
                Delay = TimeSpan.FromSeconds(1),
                ShouldHandle = new PredicateBuilder()
                    .Handle<HttpRequestException>()
                    .Handle<TaskCanceledException>(),
            })
            .Build();
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
                container = entity.Container,
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

    public async Task WarmAsync(string blobPath, int[] widths, string processedAt)
    {
        var version = (long)(DateTime.Parse(processedAt, null,
            System.Globalization.DateTimeStyles.RoundtripKind)
            - DateTime.UnixEpoch).TotalSeconds;

        // Warm the two largest widths (covers most common use cases)
        var warmWidths = widths.OrderByDescending(w => w).Take(2).ToArray();
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

    public async Task SyncEntityAsync(string entityType, IReadOnlyList<JsonElement> items)
    {
        if (items.Count == 0) return;

        var payload = new
        {
            entity = entityType,
            schemaVersion = 1,
            items,
            timestamp = DateTimeOffset.UtcNow,
        };

        await _retryPipeline.ExecuteAsync(async ct =>
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, _syncEndpoint)
            {
                Content = JsonContent.Create(payload),
            };
            request.Headers.Add("X-Internal-Auth", _secret);

            var resp = await _http.SendAsync(request, ct);
            resp.EnsureSuccessStatusCode();
        });

        _logger.LogInformation("ChangeFeed -> D1: synced {Count} {Entity}", items.Count, entityType);
    }
}
