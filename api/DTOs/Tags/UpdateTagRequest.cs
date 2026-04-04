namespace Api.DTOs.Tags;

public class UpdateTagRequest
{
    public string? Slug { get; set; }
    public string? Label { get; set; }
    public Dictionary<string, string>? Translations { get; set; }
}
