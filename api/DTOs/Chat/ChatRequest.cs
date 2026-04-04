using System.Text.Json.Serialization;

namespace Api.DTOs.Chat;

public class ChatRequest
{
    [JsonPropertyName("messages")]
    public List<ChatMessageDto> Messages { get; set; } = [];

    [JsonPropertyName("sessionId")]
    public string SessionId { get; set; } = string.Empty;

    [JsonPropertyName("turnstileToken")]
    public string? TurnstileToken { get; set; }

    [JsonPropertyName("locale")]
    public string? Locale { get; set; }

    [JsonPropertyName("pageContext")]
    public string? PageContext { get; set; }
}
