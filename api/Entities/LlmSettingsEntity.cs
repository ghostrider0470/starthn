using MongoDB.Bson.Serialization.Attributes;

namespace Api.Entities;

/// <summary>
/// Singleton settings document — always stored with _id = "settings".
/// Controls which provider+model is used for translation review.
/// </summary>
public class LlmSettingsEntity
{
    [BsonId]
    public string Id { get; set; } = "settings";

    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = false;

    [BsonElement("activeProviderKey")]
    public string? ActiveProviderKey { get; set; }

    [BsonElement("activeModelId")]
    public string? ActiveModelId { get; set; }

    [BsonElement("concurrency")]
    public int Concurrency { get; set; } = 6;

    [BsonElement("chatProviderKey")]
    public string? ChatProviderKey { get; set; }

    [BsonElement("chatModelId")]
    public string? ChatModelId { get; set; }
}
