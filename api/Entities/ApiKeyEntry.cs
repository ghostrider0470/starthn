using System.Text.Json.Serialization;

namespace Api.Entities;

public class ApiKeyEntry
{
    [JsonPropertyName("id")] public string Id { get; set; } = Guid.NewGuid().ToString("N");
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("keyHash")] public string KeyHash { get; set; } = string.Empty;
    [JsonPropertyName("keyPrefix")] public string KeyPrefix { get; set; } = string.Empty;
    [JsonPropertyName("keySuffix")] public string KeySuffix { get; set; } = string.Empty;
    [JsonPropertyName("expiresAt")] public DateTime? ExpiresAt { get; set; }
    [JsonPropertyName("lastUsedAt")] public DateTime? LastUsedAt { get; set; }
    [JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
