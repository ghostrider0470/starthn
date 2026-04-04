namespace Api.DTOs.Categories;

public class CategoryResponse
{
    public string Id { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public Dictionary<string, string> Translations { get; set; } = new();
    public string? ParentId { get; set; }
}
