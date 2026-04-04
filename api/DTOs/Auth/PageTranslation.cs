using System.Text.Json.Serialization;
using MongoDB.Bson.Serialization.Attributes;

namespace Api.DTOs.Auth;

public class PageTranslation
{
    [BsonElement("bio")]
    [JsonPropertyName("bio")]
    public string Bio { get; set; } = string.Empty;

    [BsonElement("pageContent")]
    [JsonPropertyName("pageContent")]
    public string PageContent { get; set; } = string.Empty;

    [BsonElement("isAutoTranslated")]
    [JsonPropertyName("isAutoTranslated")]
    public bool IsAutoTranslated { get; set; } = true;

    [BsonElement("translatedAt")]
    [JsonPropertyName("translatedAt")]
    public DateTime TranslatedAt { get; set; } = DateTime.UtcNow;
}
