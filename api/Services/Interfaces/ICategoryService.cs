using Api.DTOs.Categories;

namespace Api.Services.Interfaces;

public interface ICategoryService
{
    Task<CategoryResponse?> TranslateAsync(string id, IEnumerable<(string localeCode, string translatorCode)> targets, ITranslationService translationService, string label, string sourceLang = "en", Api.DTOs.LlmReviewConfig? llmReview = null);
}
