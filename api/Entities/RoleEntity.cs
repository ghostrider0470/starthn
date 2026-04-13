using System.Text.Json.Serialization;

namespace Api.Entities;

public class RoleEntity
{
    [JsonPropertyName("id")] public string Id { get; set; } = Guid.NewGuid().ToString("N");
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("slug")] public string Slug { get; set; } = string.Empty;
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("permissions")] public List<string> Permissions { get; set; } = [];
    [JsonPropertyName("isSystem")] public bool IsSystem { get; set; } = false;
    [JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [JsonPropertyName("updatedAt")] public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    [JsonPropertyName("_etag")] public string? ETag { get; set; }

    [JsonPropertyName("_deleted")]
    public bool IsDeleted { get; set; }

    [JsonPropertyName("ttl")]
    public int Ttl { get; set; } = -1;
}
