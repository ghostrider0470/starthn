namespace Api.DTOs.Categories;

public class CreateCategoryRequest
{
    public string Slug { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public Dictionary<string, string> Translations { get; set; } = new();
    public string? ParentId { get; set; }
}
