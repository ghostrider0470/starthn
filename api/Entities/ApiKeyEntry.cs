using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Api.Entities;

public class ApiKeyEntry
{
    [BsonElement("id")]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("keyHash")]
    public string KeyHash { get; set; } = string.Empty;

    [BsonElement("keyPrefix")]
    public string KeyPrefix { get; set; } = string.Empty;

    [BsonElement("keySuffix")]
    public string KeySuffix { get; set; } = string.Empty;

    [BsonElement("expiresAt")]
    public DateTime? ExpiresAt { get; set; }

    [BsonElement("lastUsedAt")]
    public DateTime? LastUsedAt { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
