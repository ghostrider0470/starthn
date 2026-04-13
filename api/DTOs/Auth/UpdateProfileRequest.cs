using Api.Entities;

namespace Api.DTOs.Auth;

public class UpdateProfileRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? PhoneNumber { get; set; }
    public bool? EmailNotifications { get; set; }
    public bool? SmsNotifications { get; set; }
    public string? Bio { get; set; }
    public string? Profession { get; set; }
    public List<string>? Expertise { get; set; }
    public SocialLinks? SocialLinks { get; set; }
    public string? Slug { get; set; }
    public string? PageContent { get; set; }
}
