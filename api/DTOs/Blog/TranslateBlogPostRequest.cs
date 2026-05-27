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
    // Post content from D1 (source of truth). When present, Cosmos DB is not read.
    public string? Title { get; set; }
    public string? Excerpt { get; set; }
    public List<string>? Content { get; set; }
}
