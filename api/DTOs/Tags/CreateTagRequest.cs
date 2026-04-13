namespace Api.DTOs.Tags;

public class CreateTagRequest
{
    public string Slug { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public Dictionary<string, string> Translations { get; set; } = new();
}
