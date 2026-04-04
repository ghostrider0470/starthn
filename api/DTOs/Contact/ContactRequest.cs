using System.Text.Json.Serialization;

namespace Api.DTOs.Contact;

public class ContactRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("company")]
    public string? Company { get; set; }

    [JsonPropertyName("subject")]
    public string Subject { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("turnstileToken")]
    public string TurnstileToken { get; set; } = string.Empty;

    /// <summary>When true, Message is already HTML — skip encoding in email service.</summary>
    [JsonIgnore]
    public bool IsHtml { get; set; } = false;
}
