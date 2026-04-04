using System.Text.Json.Serialization;

namespace Api.DTOs.Auth;

public class ExchangeCodeRequest
{
    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("provider")]
    public string Provider { get; set; } = string.Empty;

    [JsonPropertyName("redirectUri")]
    public string RedirectUri { get; set; } = string.Empty;

    [JsonPropertyName("codeVerifier")]
    public string? CodeVerifier { get; set; }
}
