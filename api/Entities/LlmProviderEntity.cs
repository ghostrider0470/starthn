using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Api.Entities;

public class LlmModelEntry
{
    [BsonElement("id")]
    public string Id { get; set; } = string.Empty;

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    // null = inherit provider-level api type
    [BsonElement("api")]
    public string? Api { get; set; }

    [BsonElement("maxTokens")]
    public int MaxTokens { get; set; } = 4096;
}

public class LlmProviderEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("key")]
    public string Key { get; set; } = string.Empty;           // unique slug, e.g. "oc-01-anthropic"

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;          // display name

    [BsonElement("baseUrl")]
    public string BaseUrl { get; set; } = string.Empty;

    [BsonElement("apiKey")]
    public string ApiKey { get; set; } = string.Empty;

    // "anthropic-messages" | "openai-completions"
    [BsonElement("api")]
    public string Api { get; set; } = "openai-completions";

    [BsonElement("headers")]
    public Dictionary<string, string> Headers { get; set; } = new();

    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = true;

    [BsonElement("models")]
    public List<LlmModelEntry> Models { get; set; } = [];

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
