namespace Api.DTOs.Blog;

public class UpdateBlogPostRequest
{
    public string? Slug { get; set; }
    public string? Title { get; set; }
    public string? Excerpt { get; set; }
    public string? PublishedAt { get; set; }
    public string? Author { get; set; }
    public string? ReadTime { get; set; }
    public string? Category { get; set; }
    public string? Subcategory { get; set; }
    public List<string>? Tags { get; set; }
    public List<string>? Content { get; set; }
    public bool? IsPublished { get; set; }
    public bool? IsFeatured { get; set; }
    public string? CoverImage { get; set; }
    public string? BannerImage { get; set; }
}
