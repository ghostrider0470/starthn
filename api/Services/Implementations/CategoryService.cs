using Api.DTOs.Categories;
using Api.Entities;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;

namespace Api.Services.Implementations;

// Trimmed to AI translation only — category CRUD/reads live in the Cloudflare
// Worker (D1). In production the Worker supplies the label override, so the
// Cosmos read/persist branches are a fallback.
public class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _categoryRepo;

    public CategoryService(ICategoryRepository categoryRepo)
    {
        _categoryRepo = categoryRepo;
    }

    public async Task<CategoryResponse?> TranslateAsync(
        string id,
        IEnumerable<(string localeCode, string translatorCode)> targets,
        ITranslationService translationService,
        string? labelOverride = null,
        string sourceLang = "en")
    {
        CategoryEntity? category;
        if (labelOverride != null)
        {
            // Use D1-supplied label; skip Cosmos DB read
            category = new CategoryEntity { Id = id, Label = labelOverride, Translations = [] };
        }
        else
        {
            category = await _categoryRepo.GetBySlugAsync(id);
            if (category == null) return null;
        }

        var translated = await translationService.TranslateToManyAsync(category.Label, targets, sourceLang);

        if (labelOverride == null)
        {
            // Only persist back to Cosmos when we actually read from it
            category.Translations["en-US"] = category.Label;
            foreach (var (locale, text) in translated)
                category.Translations[locale] = text;
            await _categoryRepo.ReplaceAsync(category);
        }

        return new CategoryResponse
        {
            Id = id,
            Label = category.Label,
            Translations = translated,
        };
    }
}
