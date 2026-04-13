using AutoMapper;
using Api.DTOs.Tags;
using Api.Entities;
using Api.Exceptions;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using Microsoft.Azure.Cosmos;

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
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Conflict)
        {
            throw new ConflictException("A tag with this slug already exists.");
        }
        return _mapper.Map<TagResponse>(doc);
    }

    public async Task<TagResponse?> UpdateAsync(string id, UpdateTagRequest request)
    {
        var existing = await _tagRepo.GetBySlugAsync(id);
        if (existing == null) return null;

        if (request.Slug != null) existing.Slug = request.Slug;
        if (request.Label != null) existing.Label = request.Label;
        if (request.Translations != null) existing.Translations = request.Translations;

        var updated = await _tagRepo.ReplaceAsync(existing);

        return _mapper.Map<TagResponse>(updated);
    }

    public async Task<TagResponse?> TranslateAsync(
        string id,
        IEnumerable<(string localeCode, string translatorCode)> targets,
        ITranslationService translationService)
    {
        var tag = await _tagRepo.GetBySlugAsync(id);
        if (tag == null) return null;

        // Always include the English label
        tag.Translations["en-US"] = tag.Label;

        var translated = await translationService.TranslateToManyAsync(tag.Label, targets);
        foreach (var (locale, text) in translated)
            tag.Translations[locale] = text;

        await _tagRepo.ReplaceAsync(tag);
        return _mapper.Map<TagResponse>(tag);
    }

    public async Task<bool> DeleteAsync(string id)
    {
        return await _tagRepo.DeleteAsync(id);
    }
}
