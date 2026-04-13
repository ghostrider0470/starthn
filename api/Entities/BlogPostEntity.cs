using System.Text.Json.Serialization;

namespace Api.Entities;

public class BlogPostEntity
{
    [JsonPropertyName("id")] public string Id { get; set; } = Guid.NewGuid().ToString("N");
    [JsonPropertyName("slug")] public string Slug { get; set; } = string.Empty;
    [JsonPropertyName("title")] public string Title { get; set; } = string.Empty;
    [JsonPropertyName("excerpt")] public string? Excerpt { get; set; }
    [JsonPropertyName("publishedAt")] public DateTime? PublishedAt { get; set; }
    [JsonPropertyName("author")] public string? Author { get; set; }
    [JsonPropertyName("readTime")] public int? ReadTime { get; set; }
    [JsonPropertyName("category")] public string? Category { get; set; }
    [JsonPropertyName("subcategory")] public string? Subcategory { get; set; }
    [JsonPropertyName("tags")] public List<string> Tags { get; set; } = [];
    [JsonPropertyName("content")] public List<object>? Content { get; set; }
    [JsonPropertyName("isPublished")] public bool IsPublished { get; set; } = true;
    [JsonPropertyName("isFeatured")] public bool IsFeatured { get; set; } = false;
    [JsonPropertyName("coverImage")] public string? CoverImage { get; set; }
    [JsonPropertyName("bannerImage")] public string? BannerImage { get; set; }
    [JsonPropertyName("authorId")] public string? AuthorId { get; set; }
    [JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [JsonPropertyName("updatedAt")] public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    [JsonPropertyName("_etag")] public string? ETag { get; set; }

    [JsonPropertyName("_deleted")]
    public bool IsDeleted { get; set; }

    [JsonPropertyName("ttl")]
    public int Ttl { get; set; } = -1;
}
