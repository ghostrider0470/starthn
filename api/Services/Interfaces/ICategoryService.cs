using Api.DTOs.Categories;

namespace Api.Services.Interfaces;

public interface ICategoryService
{
    Task<List<CategoryResponse>> GetAllAsync();
    Task<CategoryResponse> CreateAsync(CreateCategoryRequest request);
    Task<CategoryResponse?> UpdateAsync(string id, UpdateCategoryRequest request);
    Task<CategoryResponse?> TranslateAsync(string id, IEnumerable<(string localeCode, string translatorCode)> targets, ITranslationService translationService);
    Task<bool> DeleteAsync(string id);
}
