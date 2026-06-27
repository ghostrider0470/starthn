using System.Text.Json.Serialization;

namespace Api.DTOs.Auth;

public class PageTranslation
{
    [JsonPropertyName("bio")]
    public string Bio { get; set; } = string.Empty;

    [JsonPropertyName("pageContent")]
    public string PageContent { get; set; } = string.Empty;

    [JsonPropertyName("isAutoTranslated")]
    public bool IsAutoTranslated { get; set; } = true;

    [JsonPropertyName("translatedAt")]
    public DateTime TranslatedAt { get; set; } = DateTime.UtcNow;
}
