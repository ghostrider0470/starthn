using AutoMapper;
using Api.DTOs.Tags;
using Api.Entities;
using Api.Exceptions;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using MongoDB.Driver;

namespace Api.Services.Implementations;

public class TagService : ITagService
{
    private readonly ITagRepository _tagRepo;
    private readonly IMapper _mapper;

    public TagService(ITagRepository tagRepo, IMapper mapper)
    {
        _tagRepo = tagRepo;
        _mapper = mapper;
    }

    public async Task<List<TagResponse>> GetAllAsync()
    {
        var tags = await _tagRepo.GetAllAsync();
        return _mapper.Map<List<TagResponse>>(tags);
    }

    public async Task<TagResponse> CreateAsync(CreateTagRequest request)
    {
        var doc = new TagEntity
        {
            Slug = request.Slug,
            Label = request.Label,
            Translations = request.Translations,
        };

        try
        {
            await _tagRepo.InsertAsync(doc);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            throw new ConflictException("A tag with this slug already exists.");
        }
        return _mapper.Map<TagResponse>(doc);
    }

    public async Task<TagResponse?> UpdateAsync(string id, UpdateTagRequest request)
    {
        var updates = new List<UpdateDefinition<TagEntity>>();

        if (request.Slug != null) updates.Add(Builders<TagEntity>.Update.Set(t => t.Slug, request.Slug));
        if (request.Label != null) updates.Add(Builders<TagEntity>.Update.Set(t => t.Label, request.Label));
        if (request.Translations != null) updates.Add(Builders<TagEntity>.Update.Set(t => t.Translations, request.Translations));

        if (updates.Count == 0) return null;

        updates.Add(Builders<TagEntity>.Update.Set(t => t.UpdatedAt, DateTime.UtcNow));

        var combined = Builders<TagEntity>.Update.Combine(updates);
        var updated = await _tagRepo.FindOneAndUpdateAsync(id, combined);

        return updated != null ? _mapper.Map<TagResponse>(updated) : null;
    }

    public async Task<TagResponse?> TranslateAsync(
        string id,
        IEnumerable<(string localeCode, string translatorCode)> targets,
        ITranslationService translationService)
    {
        var tag = await _tagRepo.GetByIdAsync(id);
        if (tag == null) return null;

        // Always include the English label
        tag.Translations["en-US"] = tag.Label;

        var translated = await translationService.TranslateToManyAsync(tag.Label, targets);
        foreach (var (locale, text) in translated)
            tag.Translations[locale] = text;

        var update = Builders<TagEntity>.Update
            .Set(t => t.Translations, tag.Translations)
            .Set(t => t.UpdatedAt, DateTime.UtcNow);

        await _tagRepo.UpdateAsync(id, update);
        return _mapper.Map<TagResponse>(tag);
    }

    public async Task<bool> DeleteAsync(string id)
    {
        return await _tagRepo.DeleteAsync(id);
    }
}
