namespace Api.DTOs.Blog;

public class CreateBlogPostRequest
{
    public string? Slug { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Excerpt { get; set; } = string.Empty;
    public string PublishedAt { get; set; } = string.Empty;
    public string ReadTime { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Subcategory { get; set; }
    public List<string> Tags { get; set; } = [];
    public List<string> Content { get; set; } = [];
    public bool IsPublished { get; set; } = true;
    public bool IsFeatured { get; set; } = false;
    public string? CoverImage { get; set; }
    public string? BannerImage { get; set; }
}
