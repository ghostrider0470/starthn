using System.Text.Json.Serialization;

namespace Api.DTOs.Contact;

public class ContactResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("errors")]
    public Dictionary<string, string>? Errors { get; set; }
}
