namespace Api.DTOs.Categories;

public class TranslateCategoryRequest
{
    /// <summary>
    /// List of target locales as { LocaleCode, TranslatorCode } pairs.
    /// LocaleCode = BCP-47 code stored in the DB (e.g. "bs-BA").
    /// TranslatorCode = Azure Translator API code (e.g. "bs").
    /// </summary>
    public List<TranslateCategoryTarget> Targets { get; set; } = [];
    /// <summary>Label from D1 (source of truth) — always supplied by the edge.</summary>
    public string Label { get; set; } = string.Empty;
    public string SourceLocale { get; set; } = "en-US";
    public Api.DTOs.LlmReviewConfig? LlmReview { get; set; }
}

public class TranslateCategoryTarget
{
    public string LocaleCode { get; set; } = string.Empty;
    public string TranslatorCode { get; set; } = string.Empty;
}
