using System.Text.Json.Serialization;

namespace Api.Entities;

public class ProcessedImageEntity
{
    [JsonPropertyName("id")] public string Id => Path; // Cosmos requires "id"
    [JsonPropertyName("path")] public string Path { get; set; } = string.Empty;
    [JsonPropertyName("container")] public string Container { get; set; } = "blog-images";
    [JsonPropertyName("format")] public string Format { get; set; } = "webp";
    [JsonPropertyName("widths")] public int[] Widths { get; set; } = [];
    [JsonPropertyName("processedAt")] public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
    [JsonPropertyName("source")] public string Source { get; set; } = "backend";
    [JsonPropertyName("_etag")] public string? ETag { get; set; }
}
