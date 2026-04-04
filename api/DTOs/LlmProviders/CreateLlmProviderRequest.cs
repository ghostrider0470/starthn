namespace Api.DTOs.LlmProviders;

public class LlmModelRequest
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Api { get; set; }
    public int MaxTokens { get; set; } = 4096;
}

public class CreateLlmProviderRequest
{
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string Api { get; set; } = "openai-completions";
    public Dictionary<string, string> Headers { get; set; } = new();
    public bool IsEnabled { get; set; } = true;
    public List<LlmModelRequest> Models { get; set; } = [];
}

public class UpdateLlmProviderRequest
{
    public string? Name { get; set; }
    public string? BaseUrl { get; set; }
    public string? ApiKey { get; set; }       // null = keep existing key
    public string? Api { get; set; }
    public Dictionary<string, string>? Headers { get; set; }
    public bool? IsEnabled { get; set; }
    public List<LlmModelRequest>? Models { get; set; }
}

public class UpdateLlmSettingsRequest
{
    public bool? IsEnabled { get; set; }
    public string? ActiveProviderKey { get; set; }
    public string? ActiveModelId { get; set; }
    public int? Concurrency { get; set; }
}
