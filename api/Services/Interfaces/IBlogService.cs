using Api.Entities;

namespace Api.Services.Interfaces;

public interface IBlogService
{
    Task<Dictionary<string, BlogPostTranslationEntity>?> TranslateAsync(string slug, List<(string localeCode, string translatorCode)> targets, ITranslationService translationService, string sourceLocale, BlogPostEntity postData, Api.DTOs.LlmReviewConfig? llmReview = null);
}
