using System.Text.Json.Serialization;

namespace Api.Entities;

public class BlogPostTranslationEntity
{
    [JsonPropertyName("id")] public string Id { get; set; } = null!; // "{slug}:{lang}"
    [JsonPropertyName("postSlug")] public string PostSlug { get; set; } = null!;
    [JsonPropertyName("lang")] public string Lang { get; set; } = null!;
    [JsonPropertyName("title")] public string? Title { get; set; }
    [JsonPropertyName("excerpt")] public string? Excerpt { get; set; }
    [JsonPropertyName("content")] public List<object>? Content { get; set; }
    [JsonPropertyName("translatedAt")] public DateTime? TranslatedAt { get; set; }
    [JsonPropertyName("isAutoTranslated")] public bool IsAutoTranslated { get; set; }
    [JsonPropertyName("_etag")] public string? ETag { get; set; }

    [JsonPropertyName("_deleted")]
    public bool IsDeleted { get; set; }

    [JsonPropertyName("ttl")]
    public int Ttl { get; set; } = -1;
}
