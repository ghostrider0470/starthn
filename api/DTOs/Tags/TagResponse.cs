namespace Api.DTOs.Tags;

public class TagResponse
{
    public string Id { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public Dictionary<string, string> Translations { get; set; } = new();
}
