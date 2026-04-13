using AutoMapper;
using Api.DTOs.Categories;
using Api.Entities;
using Api.Exceptions;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using Microsoft.Azure.Cosmos;

namespace Api.Services.Implementations;

public class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _categoryRepo;
    private readonly IMapper _mapper;

    public CategoryService(ICategoryRepository categoryRepo, IMapper mapper)
    {
        _categoryRepo = categoryRepo;
        _mapper = mapper;
    }

    public async Task<List<CategoryResponse>> GetAllAsync()
    {
        var categories = await _categoryRepo.GetAllAsync();
        return _mapper.Map<List<CategoryResponse>>(categories);
    }

    public async Task<CategoryResponse> CreateAsync(CreateCategoryRequest request)
    {
        var doc = new CategoryEntity
        {
            Slug = request.Slug,
            Label = request.Label,
            Translations = request.Translations,
            ParentId = request.ParentId,
        };

        try
        {
            await _categoryRepo.InsertAsync(doc);
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Conflict)
        {
            throw new ConflictException("A category with this slug already exists.");
        }
        return _mapper.Map<CategoryResponse>(doc);
    }

    public async Task<CategoryResponse?> UpdateAsync(string id, UpdateCategoryRequest request)
    {
        var existing = await _categoryRepo.GetBySlugAsync(id);
        if (existing == null) return null;

        if (request.Slug != null) existing.Slug = request.Slug;
        if (request.Label != null) existing.Label = request.Label;
        if (request.Translations != null) existing.Translations = request.Translations;
        if (request.ParentId != null) existing.ParentId = request.ParentId;

        var updated = await _categoryRepo.ReplaceAsync(existing);

        return _mapper.Map<CategoryResponse>(updated);
    }

    public async Task<CategoryResponse?> TranslateAsync(
        string id,
        IEnumerable<(string localeCode, string translatorCode)> targets,
        ITranslationService translationService)
    {
        var category = await _categoryRepo.GetBySlugAsync(id);
        if (category == null) return null;

        // Always include the English label
        category.Translations["en-US"] = category.Label;

        var translated = await translationService.TranslateToManyAsync(category.Label, targets);
        foreach (var (locale, text) in translated)
            category.Translations[locale] = text;

        await _categoryRepo.ReplaceAsync(category);
        return _mapper.Map<CategoryResponse>(category);
    }

    public async Task<bool> DeleteAsync(string id)
    {
        return await _categoryRepo.DeleteAsync(id);
    }
}
