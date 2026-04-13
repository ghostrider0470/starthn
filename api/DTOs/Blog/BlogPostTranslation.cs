using System.Text.Json.Serialization;

namespace Api.DTOs.Blog;

public class BlogPostTranslation
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("excerpt")]
    public string Excerpt { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public List<string> Content { get; set; } = [];

    [JsonPropertyName("isAutoTranslated")]
    public bool IsAutoTranslated { get; set; } = true;

    [JsonPropertyName("translatedAt")]
    public DateTime TranslatedAt { get; set; } = DateTime.UtcNow;
}
