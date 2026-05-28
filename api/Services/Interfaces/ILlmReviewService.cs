namespace Api.Services.Interfaces;

public interface ILlmReviewService
{
    bool IsEnabled { get; }
    Task<string> ReviewAsync(string original, string translated, string localeCode, string sourceLocale = "en-US");
    Task<Dictionary<string, string>> ReviewManyAsync(string original, Dictionary<string, string> translations, string sourceLocale = "en-US");
}
