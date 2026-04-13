using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;
using Api.Helpers;

namespace Api.Functions;

public class ForceSyncFunction
{
    private readonly Database _db;
    private readonly HttpClient _http;
    private readonly string _syncEndpoint;
    private readonly string _syncSecret;
    private readonly ILogger<ForceSyncFunction> _logger;

    private static readonly string[] Containers =
        ["blogPosts", "users", "categories", "tags", "caseStudies", "roles",
         "blogPostTranslations", "userPageTranslations", "processedImages"];

    public ForceSyncFunction(
        Database db,
        IHttpClientFactory httpFactory,
        IConfiguration config,
        ILogger<ForceSyncFunction> logger)
    {
        _db = db;
        _http = httpFactory.CreateClient();
        _syncEndpoint = config["ManifestSync:SyncEndpoint"]
            ?? config["ManifestSync:Endpoint"]?.Replace("/image-manifest", "/sync")
            ?? "https://www.horizon-tech.io/api/internal/sync";
        _syncSecret = config["ManifestSync:Secret"]
            ?? throw new InvalidOperationException("ManifestSync:Secret not configured");
        _logger = logger;
    }

    [Function("ForceSync")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/force-sync")]
        HttpRequestData req)
    {
        if (!req.Headers.TryGetValues("X-Internal-Auth", out var authValues)
            || authValues.FirstOrDefault() != _syncSecret)
            return req.CreateResponse(HttpStatusCode.Unauthorized);

        var results = new Dictionary<string, object>();

        foreach (var containerName in Containers)
        {
            try
            {
                var container = _db.GetContainer(containerName);
                var query = new QueryDefinition(
                    "SELECT * FROM c WHERE (NOT IS_DEFINED(c._deleted) OR c._deleted = false)");

                // Use stream iterator to avoid Cosmos SDK serializer issues with JsonElement
                var rawItems = new List<string>();
                using var iterator = container.GetItemQueryStreamIterator(query);
                while (iterator.HasMoreResults)
                {
                    using var response = await iterator.ReadNextAsync();
                    using var doc = await JsonDocument.ParseAsync(response.Content);
                    foreach (var item in doc.RootElement.GetProperty("Documents").EnumerateArray())
                        rawItems.Add(item.GetRawText());
                }

                if (rawItems.Count > 0)
                {
                    // Build the JSON payload manually from raw strings
                    var itemsJson = "[" + string.Join(",", rawItems) + "]";
                    var payloadJson = $$"""{"entity":"{{containerName}}","schemaVersion":1,"items":{{itemsJson}},"timestamp":"{{DateTimeOffset.UtcNow:O}}"}""";

                    using var request = new HttpRequestMessage(HttpMethod.Post, _syncEndpoint)
                    {
                        Content = new StringContent(payloadJson, System.Text.Encoding.UTF8, "application/json"),
                    };
                    request.Headers.Add("X-Internal-Auth", _syncSecret);

                    var response = await _http.SendAsync(request);
                    response.EnsureSuccessStatusCode();
                }

                results[containerName] = new { synced = rawItems.Count };
                _logger.LogInformation("ForceSync: {Container} — {Count} items", containerName, rawItems.Count);
            }
            catch (Exception ex)
            {
                results[containerName] = new { error = ex.Message };
                _logger.LogError(ex, "ForceSync failed for {Container}", containerName);
            }
        }

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, results);
    }
}
