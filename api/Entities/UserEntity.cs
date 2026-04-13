using System.Text.Json.Serialization;

namespace Api.Entities;

public class SocialLinks
{
    [JsonPropertyName("linkedIn")] public string? LinkedIn { get; set; }
    [JsonPropertyName("twitter")] public string? Twitter { get; set; }
    [JsonPropertyName("gitHub")] public string? GitHub { get; set; }
    [JsonPropertyName("website")] public string? Website { get; set; }
}


public class UserEntity
{
    [JsonPropertyName("id")] public string Id { get; set; } = Guid.NewGuid().ToString("N");
    [JsonPropertyName("email")] public string Email { get; set; } = string.Empty;
    [JsonPropertyName("passwordHash")] public string? PasswordHash { get; set; }
    [JsonPropertyName("firstName")] public string? FirstName { get; set; }
    [JsonPropertyName("lastName")] public string? LastName { get; set; }
    [JsonPropertyName("phoneNumber")] public string? PhoneNumber { get; set; }
    [JsonPropertyName("roles")] public List<string> Roles { get; set; } = ["User"];
    [JsonPropertyName("permissions")] public List<string> Permissions { get; set; } = [];
    [JsonPropertyName("isActive")] public bool IsActive { get; set; } = true;
    [JsonPropertyName("isOptedOut")] public bool IsOptedOut { get; set; } = false;
    [JsonPropertyName("emailNotifications")] public bool EmailNotifications { get; set; } = true;
    [JsonPropertyName("smsNotifications")] public bool SmsNotifications { get; set; } = false;
    [JsonPropertyName("avatarUrl")] public string? AvatarUrl { get; set; }
    [JsonPropertyName("bio")] public string? Bio { get; set; }
    [JsonPropertyName("profession")] public string? Profession { get; set; }
    [JsonPropertyName("expertise")] public List<string> Expertise { get; set; } = [];
    [JsonPropertyName("socialLinks")] public SocialLinks SocialLinks { get; set; } = new();
    [JsonPropertyName("slug")] public string? Slug { get; set; }
    [JsonPropertyName("pageContent")] public List<object>? PageContent { get; set; }
    [JsonPropertyName("apiKeys")] public List<ApiKeyEntry> ApiKeys { get; set; } = [];
    [JsonPropertyName("refreshToken")] public string? RefreshToken { get; set; }
    [JsonPropertyName("refreshTokenExpiryTime")] public DateTime? RefreshTokenExpiryTime { get; set; }
    [JsonPropertyName("createdAt")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [JsonPropertyName("updatedAt")] public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    [JsonPropertyName("_etag")] public string? ETag { get; set; }
}
