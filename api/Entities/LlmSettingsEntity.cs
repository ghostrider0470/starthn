using System.Text.Json.Serialization;

namespace Api.Entities;

/// <summary>
/// Singleton settings document — always stored with _id = "settings".
/// Controls which provider+model is used for translation review.
/// </summary>
public class LlmSettingsEntity
{
    [JsonPropertyName("id")] public string Id { get; set; } = "settings";
    [JsonPropertyName("isEnabled")] public bool IsEnabled { get; set; } = false;
    [JsonPropertyName("activeProviderKey")] public string? ActiveProviderKey { get; set; }
    [JsonPropertyName("activeModelId")] public string? ActiveModelId { get; set; }
    [JsonPropertyName("concurrency")] public int Concurrency { get; set; } = 6;
    [JsonPropertyName("chatProviderKey")] public string? ChatProviderKey { get; set; }
    [JsonPropertyName("chatModelId")] public string? ChatModelId { get; set; }
    [JsonPropertyName("_etag")] public string? ETag { get; set; }
}
