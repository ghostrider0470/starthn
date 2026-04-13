using System.Text.Json.Serialization;

namespace Api.DTOs.Auth;

public class ExternalLoginRequest
{
    [JsonPropertyName("provider")]
    public string Provider { get; set; } = string.Empty;

    [JsonPropertyName("idToken")]
    public string IdToken { get; set; } = string.Empty;
}
