using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Api.Entities;

public class SocialLinks
{
    [BsonElement("linkedIn")]
    public string? LinkedIn { get; set; }

    [BsonElement("twitter")]
    public string? Twitter { get; set; }

    [BsonElement("gitHub")]
    public string? GitHub { get; set; }

    [BsonElement("website")]
    public string? Website { get; set; }
}

public class UserEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("email")]
    public string Email { get; set; } = string.Empty;

    [BsonElement("passwordHash")]
    public string PasswordHash { get; set; } = string.Empty;

    [BsonElement("firstName")]
    public string FirstName { get; set; } = string.Empty;

    [BsonElement("lastName")]
    public string LastName { get; set; } = string.Empty;

    [BsonElement("phoneNumber")]
    public string? PhoneNumber { get; set; }

    [BsonElement("roles")]
    public List<string> Roles { get; set; } = ["User"];

    [BsonElement("permissions")]
    public List<string> Permissions { get; set; } = [];

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    [BsonElement("isOptedOut")]
    public bool IsOptedOut { get; set; } = false;

    [BsonElement("emailNotifications")]
    public bool EmailNotifications { get; set; } = true;

    [BsonElement("smsNotifications")]
    public bool SmsNotifications { get; set; } = false;

    [BsonElement("avatarUrl")]
    public string? AvatarUrl { get; set; }

    [BsonElement("bio")]
    public string? Bio { get; set; }

    [BsonElement("profession")]
    public string? Profession { get; set; }

    [BsonElement("expertise")]
    public List<string> Expertise { get; set; } = [];

    [BsonElement("socialLinks")]
    public SocialLinks SocialLinks { get; set; } = new();

    [BsonElement("slug")]
    public string? Slug { get; set; }

    [BsonElement("pageContent")]
    public string? PageContent { get; set; }

    [BsonElement("pageTranslations")]
    public Dictionary<string, Api.DTOs.Auth.PageTranslation> PageTranslations { get; set; } = new();

    [BsonElement("apiKeys")]
    public List<ApiKeyEntry> ApiKeys { get; set; } = [];

    [BsonElement("refreshToken")]
    public string? RefreshToken { get; set; }

    [BsonElement("refreshTokenExpiryTime")]
    public DateTime? RefreshTokenExpiryTime { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
