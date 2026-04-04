using System.Text.Json.Serialization;
using MongoDB.Bson.Serialization.Attributes;

namespace Api.DTOs.Blog;

public class BlogPostTranslation
{
    [BsonElement("title")]
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("excerpt")]
    [JsonPropertyName("excerpt")]
    public string Excerpt { get; set; } = string.Empty;

    [BsonElement("content")]
    [JsonPropertyName("content")]
    public List<string> Content { get; set; } = [];

    [BsonElement("isAutoTranslated")]
    [JsonPropertyName("isAutoTranslated")]
    public bool IsAutoTranslated { get; set; } = true;

    [BsonElement("translatedAt")]
    [JsonPropertyName("translatedAt")]
    public DateTime TranslatedAt { get; set; } = DateTime.UtcNow;
}
