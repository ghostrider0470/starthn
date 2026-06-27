namespace Api.DTOs.Auth;

public class TranslatePageRequest
{
    /// <summary>Target locale codes (Azure Translator codes, e.g. "de", "fr").</summary>
    public List<string> Languages { get; set; } = [];

    /// <summary>Source bio from D1 (source of truth) — supplied by the edge.</summary>
    public string? Bio { get; set; }

    /// <summary>Source page content (HTML/text) from D1 — supplied by the edge.</summary>
    public string? PageContent { get; set; }
}
