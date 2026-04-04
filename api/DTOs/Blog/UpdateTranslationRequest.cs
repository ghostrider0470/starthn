namespace Api.DTOs.Blog;

public class UpdateTranslationRequest
{
    public string? Title { get; set; }
    public string? Excerpt { get; set; }
    public List<string>? Content { get; set; }
}
