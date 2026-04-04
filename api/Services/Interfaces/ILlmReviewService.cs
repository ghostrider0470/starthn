namespace Api.Services.Interfaces;

public interface ILlmReviewService
{
    bool IsEnabled { get; }
    Task<string> ReviewAsync(string original, string translated, string localeCode);
    Task<Dictionary<string, string>> ReviewManyAsync(string original, Dictionary<string, string> translations);
}
