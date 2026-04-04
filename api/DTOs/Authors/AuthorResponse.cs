using Api.Entities;

namespace Api.DTOs.Authors;

public class AuthorResponse
{
    public string Id { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public string? Profession { get; set; }
    public List<string> Expertise { get; set; } = [];
    public SocialLinks SocialLinks { get; set; } = new();
    public string? PageContent { get; set; }
    public int PostCount { get; set; }
}

public class UpdateAuthorProfileRequest
{
    public string? Bio { get; set; }
    public string? Profession { get; set; }
    public List<string>? Expertise { get; set; }
    public SocialLinks? SocialLinks { get; set; }
    public string? Slug { get; set; }
}
