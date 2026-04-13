using System.Text.Json.Serialization;

namespace Api.Entities;

public class LlmModelEntry
{
    [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    // null = inherit provider-level api type
    [JsonPropertyName("api")] public string? Api { get; set; }
    [JsonPropertyName("maxTokens")] public int MaxTokens { get; set; } = 4096;
}

public class LlmProviderEntity
{
    [JsonPropertyName("id")] public string Id { get; set; } = Guid.NewGuid().ToString("N");
    [JsonPropertyName("key")] public string Key { get; set; } = string.Empty;           // unique slug, e.g. "oc-01-anthropic"
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;          // display name
    [JsonPropertyName("baseUrl")] public string BaseUrl { get; set; } = string.Empty;
    [JsonPropertyName("apiKey")] public string ApiKey { get; set; } = string.Empty;
    // "anthropic-messages" | "openai-completions"
    [JsonPropertyName("api")] public string Api { get; set; } = "openai-completions";
    [JsonPropertyName("headers")] public Dictionary<string, string> Headers { get; set; } = new();
    [JsonPropertyName("isEnabled")] public bool IsEnabled { get; set; } = true;
    [JsonPropertyName("models")] public List<LlmModelEntry> Models { get; set; } = [];
    [JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [JsonPropertyName("updatedAt")] public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    [JsonPropertyName("_etag")] public string? ETag { get; set; }

    [JsonPropertyName("_deleted")]
    public bool IsDeleted { get; set; }

    [JsonPropertyName("ttl")]
    public int Ttl { get; set; } = -1;
}
