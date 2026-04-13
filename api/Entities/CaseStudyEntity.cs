using System.Text.Json.Serialization;

namespace Api.Entities;

public class CaseStudyEntity
{
    [JsonPropertyName("id")] public string Id { get; set; } = Guid.NewGuid().ToString("N");
    [JsonPropertyName("slug")] public string Slug { get; set; } = string.Empty;
    [JsonPropertyName("title")] public string Title { get; set; } = string.Empty;
    [JsonPropertyName("client")] public string Client { get; set; } = string.Empty;
    [JsonPropertyName("industry")] public string Industry { get; set; } = string.Empty;
    [JsonPropertyName("description")] public string Description { get; set; } = string.Empty;
    [JsonPropertyName("executiveSummary")] public string ExecutiveSummary { get; set; } = string.Empty;
    [JsonPropertyName("challenge")] public string Challenge { get; set; } = string.Empty;
    [JsonPropertyName("solution")] public string Solution { get; set; } = string.Empty;
    [JsonPropertyName("architectureDecisions")] public List<ArchitectureDecisionEntry> ArchitectureDecisions { get; set; } = [];
    [JsonPropertyName("techStack")] public List<string> TechStack { get; set; } = [];
    [JsonPropertyName("results")] public List<ResultEntry> Results { get; set; } = [];
    [JsonPropertyName("tags")] public List<string> Tags { get; set; } = [];
    [JsonPropertyName("isPublished")] public bool IsPublished { get; set; } = true;
    [JsonPropertyName("isFeatured")] public bool IsFeatured { get; set; } = false;
    [JsonPropertyName("coverImage")] public string? CoverImage { get; set; }
    [JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [JsonPropertyName("updatedAt")] public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    [JsonPropertyName("_etag")] public string? ETag { get; set; }

    [JsonPropertyName("_deleted")]
    public bool IsDeleted { get; set; }

    [JsonPropertyName("ttl")]
    public int Ttl { get; set; } = -1;
}

public class ArchitectureDecisionEntry
{
    [JsonPropertyName("decision")] public string Decision { get; set; } = string.Empty;
    [JsonPropertyName("rationale")] public string Rationale { get; set; } = string.Empty;
}

public class ResultEntry
{
    [JsonPropertyName("metric")] public string Metric { get; set; } = string.Empty;
    [JsonPropertyName("value")] public string Value { get; set; } = string.Empty;
    [JsonPropertyName("description")] public string Description { get; set; } = string.Empty;
}
