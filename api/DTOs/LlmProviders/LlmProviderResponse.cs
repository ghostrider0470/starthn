namespace Api.DTOs.LlmProviders;

public class LlmModelResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Api { get; set; }
    public int MaxTokens { get; set; }
}

public class LlmProviderResponse
{
    public string Id { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = string.Empty;
    public string ApiKeyMasked { get; set; } = string.Empty;  // never return raw key
    public string Api { get; set; } = string.Empty;
    public Dictionary<string, string> Headers { get; set; } = new();
    public bool IsEnabled { get; set; }
    public List<LlmModelResponse> Models { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class LlmSettingsResponse
{
    public bool IsEnabled { get; set; }
    public string? ActiveProviderKey { get; set; }
    public string? ActiveModelId { get; set; }
    public int Concurrency { get; set; }
    public string? ChatProviderKey { get; set; }
    public string? ChatModelId { get; set; }
}
