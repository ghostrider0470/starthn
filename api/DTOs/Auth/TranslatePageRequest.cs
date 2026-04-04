namespace Api.DTOs.Auth;

public class TranslatePageRequest
{
    public List<string> Languages { get; set; } = [];
}

public class UpdatePageTranslationRequest
{
    public string? Bio { get; set; }
    public string? PageContent { get; set; }
}
