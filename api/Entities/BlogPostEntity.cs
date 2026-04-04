using Api.DTOs.Blog;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Api.Entities;

public class BlogPostEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("slug")]
    public string Slug { get; set; } = string.Empty;

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("excerpt")]
    public string Excerpt { get; set; } = string.Empty;

    [BsonElement("publishedAt")]
    public string PublishedAt { get; set; } = string.Empty;

    [BsonElement("author")]
    public string Author { get; set; } = string.Empty;

    [BsonElement("readTime")]
    public string ReadTime { get; set; } = string.Empty;

    [BsonElement("category")]
    public string Category { get; set; } = string.Empty;

    [BsonElement("subcategory")]
    public string? Subcategory { get; set; }

    [BsonElement("tags")]
    public List<string> Tags { get; set; } = [];

    [BsonElement("content")]
    public List<string> Content { get; set; } = [];

    [BsonElement("isPublished")]
    public bool IsPublished { get; set; } = true;

    [BsonElement("isFeatured")]
    public bool IsFeatured { get; set; } = false;

    [BsonElement("coverImage")]
    public string? CoverImage { get; set; }

    [BsonElement("bannerImage")]
    public string? BannerImage { get; set; }

    [BsonElement("authorId")]
    public string? AuthorId { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("translations")]
    public Dictionary<string, BlogPostTranslation> Translations { get; set; } = new();
}
