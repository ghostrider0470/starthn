using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Api.Entities;

public class CaseStudyEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("slug")]
    public string Slug { get; set; } = string.Empty;

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("client")]
    public string Client { get; set; } = string.Empty;

    [BsonElement("industry")]
    public string Industry { get; set; } = string.Empty;

    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    [BsonElement("executiveSummary")]
    public string ExecutiveSummary { get; set; } = string.Empty;

    [BsonElement("challenge")]
    public string Challenge { get; set; } = string.Empty;

    [BsonElement("solution")]
    public string Solution { get; set; } = string.Empty;

    [BsonElement("architectureDecisions")]
    public List<ArchitectureDecisionEntry> ArchitectureDecisions { get; set; } = [];

    [BsonElement("techStack")]
    public List<string> TechStack { get; set; } = [];

    [BsonElement("results")]
    public List<ResultEntry> Results { get; set; } = [];

    [BsonElement("tags")]
    public List<string> Tags { get; set; } = [];

    [BsonElement("isPublished")]
    public bool IsPublished { get; set; } = true;

    [BsonElement("isFeatured")]
    public bool IsFeatured { get; set; } = false;

    [BsonElement("coverImage")]
    public string? CoverImage { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class ArchitectureDecisionEntry
{
    [BsonElement("decision")]
    public string Decision { get; set; } = string.Empty;

    [BsonElement("rationale")]
    public string Rationale { get; set; } = string.Empty;
}

public class ResultEntry
{
    [BsonElement("metric")]
    public string Metric { get; set; } = string.Empty;

    [BsonElement("value")]
    public string Value { get; set; } = string.Empty;

    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;
}
