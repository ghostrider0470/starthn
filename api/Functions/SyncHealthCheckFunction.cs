using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Api.Functions;

public class SyncHealthCheckFunction
{
    private readonly HttpClient _http;
    private readonly ILogger<SyncHealthCheckFunction> _logger;
    private readonly string _syncEndpoint;
    private readonly string _syncSecret;

    public SyncHealthCheckFunction(
        IHttpClientFactory httpFactory,
        IConfiguration config,
        ILogger<SyncHealthCheckFunction> logger)
    {
        _http = httpFactory.CreateClient();
        _logger = logger;
        _syncEndpoint = config["ManifestSync:Endpoint"]?.Replace("/image-manifest", "")
            ?? "https://www.horizon-tech.io/api/internal";
        _syncSecret = config["ManifestSync:Secret"]
            ?? throw new InvalidOperationException("ManifestSync:Secret not configured");
    }

    [Function("SyncHealthCheck")]
    public async Task Run([TimerTrigger("0 */5 * * * *")] TimerInfo timer)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get,
                $"{_syncEndpoint}/health");
            request.Headers.Add("X-Internal-Auth", _syncSecret);

            var response = await _http.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var health = await response.Content.ReadFromJsonAsync<HealthResponse>();
            if (health is null) return;

            if (health.SyncAgeSeconds is > 300)
            {
                _logger.LogCritical(
                    "D1 sync stale: {Age}s since last sync at {LastSync}. Counts: posts={Posts} users={Users}",
                    health.SyncAgeSeconds, health.LastSync,
                    health.Counts?.BlogPosts, health.Counts?.Users);
            }
            else
            {
                _logger.LogInformation(
                    "D1 sync healthy: {Age}s, posts={Posts} users={Users} tags={Tags}",
                    health.SyncAgeSeconds,
                    health.Counts?.BlogPosts, health.Counts?.Users, health.Counts?.Tags);
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

        [JsonPropertyName("tags")]
        public int Tags { get; init; }
    }
}
