using System.Net.Http.Json;
using System.Text.Json;
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

    private static readonly JsonSerializerOptions _camelCaseOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public async Task TrySyncOneAsync<T>(string entityType, T item)
    {
        try
        {
            var element = JsonSerializer.SerializeToElement(item, _camelCaseOptions);
            await SyncEntityAsync(entityType, [element]);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Write-through sync failed for {EntityType}", entityType);
        }
    }

    public async Task TrySyncDeleteAsync(string entityType, string id)
    {
        try
        {
            var element = JsonSerializer.SerializeToElement(new { id, _deleted = true });
            await SyncEntityAsync(entityType, [element]);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Write-through delete sync failed for {EntityType} id={Id}", entityType, id);
        }
    }
}
