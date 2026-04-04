using AutoMapper;
using Api.DTOs.Categories;
using Api.Entities;
using Api.Exceptions;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using MongoDB.Driver;

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
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            throw new ConflictException("A category with this slug already exists.");
        }
        return _mapper.Map<CategoryResponse>(doc);
    }

    public async Task<CategoryResponse?> UpdateAsync(string id, UpdateCategoryRequest request)
    {
        var updates = new List<UpdateDefinition<CategoryEntity>>();

        if (request.Slug != null) updates.Add(Builders<CategoryEntity>.Update.Set(c => c.Slug, request.Slug));
        if (request.Label != null) updates.Add(Builders<CategoryEntity>.Update.Set(c => c.Label, request.Label));
        if (request.Translations != null) updates.Add(Builders<CategoryEntity>.Update.Set(c => c.Translations, request.Translations));
        if (request.ParentId != null) updates.Add(Builders<CategoryEntity>.Update.Set(c => c.ParentId, request.ParentId));

        if (updates.Count == 0) return null;

        updates.Add(Builders<CategoryEntity>.Update.Set(c => c.UpdatedAt, DateTime.UtcNow));

        var combined = Builders<CategoryEntity>.Update.Combine(updates);
        var updated = await _categoryRepo.FindOneAndUpdateAsync(id, combined);

        return updated != null ? _mapper.Map<CategoryResponse>(updated) : null;
    }

    public async Task<CategoryResponse?> TranslateAsync(
        string id,
        IEnumerable<(string localeCode, string translatorCode)> targets,
        ITranslationService translationService)
    {
        var category = await _categoryRepo.GetByIdAsync(id);
        if (category == null) return null;

        // Always include the English label
        category.Translations["en-US"] = category.Label;

        var translated = await translationService.TranslateToManyAsync(category.Label, targets);
        foreach (var (locale, text) in translated)
            category.Translations[locale] = text;

        var update = Builders<CategoryEntity>.Update
            .Set(c => c.Translations, category.Translations)
            .Set(c => c.UpdatedAt, DateTime.UtcNow);

        await _categoryRepo.UpdateAsync(id, update);
        return _mapper.Map<CategoryResponse>(category);
    }

    public async Task<bool> DeleteAsync(string id)
    {
        return await _categoryRepo.DeleteAsync(id);
    }
}
