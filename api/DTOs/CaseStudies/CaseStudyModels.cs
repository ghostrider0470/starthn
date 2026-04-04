using System.Text.Json.Serialization;

namespace Api.DTOs.CaseStudies;

// --- DTOs for embedded arrays ---

public class ArchitectureDecisionDto
{
    [JsonPropertyName("decision")]
    public string Decision { get; set; } = string.Empty;

    [JsonPropertyName("rationale")]
    public string Rationale { get; set; } = string.Empty;
}

public class ResultDto
{
    [JsonPropertyName("metric")]
    public string Metric { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public string Value { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;
}

// --- Create ---

public class CreateCaseStudyRequest
{
    public string? Slug { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Client { get; set; } = string.Empty;
    public string Industry { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ExecutiveSummary { get; set; } = string.Empty;
    public string Challenge { get; set; } = string.Empty;
    public string Solution { get; set; } = string.Empty;
    public List<ArchitectureDecisionDto> ArchitectureDecisions { get; set; } = [];
    public List<string> TechStack { get; set; } = [];
    public List<ResultDto> Results { get; set; } = [];
    public List<string> Tags { get; set; } = [];
    public bool IsPublished { get; set; } = true;
    public bool IsFeatured { get; set; } = false;
    public string? CoverImage { get; set; }
}

// --- Update (all nullable for partial updates) ---

public class UpdateCaseStudyRequest
{
    public string? Slug { get; set; }
    public string? Title { get; set; }
    public string? Client { get; set; }
    public string? Industry { get; set; }
    public string? Description { get; set; }
    public string? ExecutiveSummary { get; set; }
    public string? Challenge { get; set; }
    public string? Solution { get; set; }
    public List<ArchitectureDecisionDto>? ArchitectureDecisions { get; set; }
    public List<string>? TechStack { get; set; }
    public List<ResultDto>? Results { get; set; }
    public List<string>? Tags { get; set; }
    public bool? IsPublished { get; set; }
    public bool? IsFeatured { get; set; }
    public string? CoverImage { get; set; }
}

// --- Response (public) ---

public class CaseStudyResponse
{
    [JsonPropertyName("slug")]
    public string Slug { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("client")]
    public string Client { get; set; } = string.Empty;

    [JsonPropertyName("industry")]
    public string Industry { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("executiveSummary")]
    public string ExecutiveSummary { get; set; } = string.Empty;

    [JsonPropertyName("challenge")]
    public string Challenge { get; set; } = string.Empty;

    [JsonPropertyName("solution")]
    public string Solution { get; set; } = string.Empty;

    [JsonPropertyName("architectureDecisions")]
    public List<ArchitectureDecisionDto> ArchitectureDecisions { get; set; } = [];

    [JsonPropertyName("techStack")]
    public List<string> TechStack { get; set; } = [];

    [JsonPropertyName("results")]
    public List<ResultDto> Results { get; set; } = [];

    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = [];

    [JsonPropertyName("isFeatured")]
    public bool IsFeatured { get; set; }

    [JsonPropertyName("coverImage")]
    public string? CoverImage { get; set; }
}

// --- Admin response (extends public with admin fields) ---

public class AdminCaseStudyResponse : CaseStudyResponse
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("isPublished")]
    public bool IsPublished { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
