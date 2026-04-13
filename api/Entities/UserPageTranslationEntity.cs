using System.Text.Json.Serialization;

namespace Api.Entities;

public class UserPageTranslationEntity
{
    [JsonPropertyName("id")] public string Id { get; set; } = null!; // "{userId}:{lang}"
    [JsonPropertyName("userId")] public string UserId { get; set; } = null!;
    [JsonPropertyName("lang")] public string Lang { get; set; } = null!;
    [JsonPropertyName("bio")] public string? Bio { get; set; }
    [JsonPropertyName("pageContent")] public List<object>? PageContent { get; set; }
    [JsonPropertyName("isAutoTranslated")] public bool IsAutoTranslated { get; set; }
    [JsonPropertyName("translatedAt")] public DateTime TranslatedAt { get; set; } = DateTime.UtcNow;
    [JsonPropertyName("_etag")] public string? ETag { get; set; }

    [JsonPropertyName("_deleted")]
    public bool IsDeleted { get; set; }

    [JsonPropertyName("ttl")]
    public int Ttl { get; set; } = -1;
}
