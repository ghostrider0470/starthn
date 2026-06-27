namespace Api.Services.Interfaces;

public interface ILlmReviewService
{
    Task<string> ReviewAsync(string original, string translated, string localeCode, Api.DTOs.LlmReviewConfig? config = null);
    Task<Dictionary<string, string>> ReviewManyAsync(string original, Dictionary<string, string> translations, Api.DTOs.LlmReviewConfig? config = null);
}
