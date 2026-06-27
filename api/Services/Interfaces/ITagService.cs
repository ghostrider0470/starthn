using Api.DTOs.Tags;

namespace Api.Services.Interfaces;

public interface ITagService
{
    Task<TagResponse?> TranslateAsync(string id, IEnumerable<(string localeCode, string translatorCode)> targets, ITranslationService translationService, string label, string sourceLang = "en", Api.DTOs.LlmReviewConfig? llmReview = null);
}
