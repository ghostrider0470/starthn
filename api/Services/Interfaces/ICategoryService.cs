using Api.DTOs.Categories;

namespace Api.Services.Interfaces;

public interface ICategoryService
{
    Task<CategoryResponse?> TranslateAsync(string id, IEnumerable<(string localeCode, string translatorCode)> targets, ITranslationService translationService, string? labelOverride = null, string sourceLang = "en");
}
