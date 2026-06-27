namespace Api.DTOs.Tags;

public class TranslateTagRequest
{
    /// <summary>
    /// List of target locales as { LocaleCode, TranslatorCode } pairs.
    /// LocaleCode = BCP-47 code stored in the DB (e.g. "bs-BA").
    /// TranslatorCode = Azure Translator API code (e.g. "bs").
    /// If empty, the backend translates to all provided targets.
    /// </summary>
    public List<TranslateTagTarget> Targets { get; set; } = [];
    /// <summary>Label from D1 (source of truth) — always supplied by the edge.</summary>
    public string Label { get; set; } = string.Empty;
    public string SourceLocale { get; set; } = "en-US";
    public Api.DTOs.LlmReviewConfig? LlmReview { get; set; }
}

public class TranslateTagTarget
{
    public string LocaleCode { get; set; } = string.Empty;
    public string TranslatorCode { get; set; } = string.Empty;
}
