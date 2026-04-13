namespace Api.DTOs.Categories;

public class UpdateCategoryRequest
{
    public string? Slug { get; set; }
    public string? Label { get; set; }
    public Dictionary<string, string>? Translations { get; set; }
    public string? ParentId { get; set; }
}
