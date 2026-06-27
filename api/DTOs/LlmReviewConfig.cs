namespace Api.DTOs;

// Provider config for the LLM review step, supplied by the edge per-request
// (read from D1). Null => skip LLM review. Replaces the old Cosmos lookup.
public class LlmReviewConfig
{
    public string Api { get; set; } = "openai";
    public string BaseUrl { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public Dictionary<string, string>? Headers { get; set; }
}
