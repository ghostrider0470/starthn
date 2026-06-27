namespace Api.DTOs.Blog;

public class TranslateBlogPostTarget
{
    public string LocaleCode { get; set; } = string.Empty;
    public string TranslatorCode { get; set; } = string.Empty;
}

public class TranslateBlogPostRequest
{
    public List<TranslateBlogPostTarget> Targets { get; set; } = [];
    public string SourceLocale { get; set; } = "en-US";
    // Post content from D1 (source of truth) — always supplied by the edge.
    public string Title { get; set; } = string.Empty;
    public string? Excerpt { get; set; }
    public List<string>? Content { get; set; }
    public Api.DTOs.LlmReviewConfig? LlmReview { get; set; }
}
