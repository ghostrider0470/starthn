using Api.DTOs.Tags;
using Api.Entities;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;

namespace Api.Services.Implementations;

// Trimmed to AI translation only — tag CRUD/reads live in the Cloudflare Worker
// (D1). In production the Worker supplies the label override, so the Cosmos
// read/persist branches are a fallback.
public class TagService : ITagService
{
    private readonly ITagRepository _tagRepo;

    public TagService(ITagRepository tagRepo)
    {
        _tagRepo = tagRepo;
    }

    public async Task<TagResponse?> TranslateAsync(
        string id,
        IEnumerable<(string localeCode, string translatorCode)> targets,
        ITranslationService translationService,
        string? labelOverride = null,
        string sourceLang = "en")
    {
        TagEntity? tag;
        if (labelOverride != null)
        {
            tag = new TagEntity { Id = id, Label = labelOverride, Translations = [] };
        }
        else
        {
            tag = await _tagRepo.GetBySlugAsync(id);
            if (tag == null) return null;
        }

        var translated = await translationService.TranslateToManyAsync(tag.Label, targets, sourceLang);

        if (labelOverride == null)
        {
            tag.Translations["en-US"] = tag.Label;
            foreach (var (locale, text) in translated)
                tag.Translations[locale] = text;
            await _tagRepo.ReplaceAsync(tag);
        }

        return new TagResponse { Id = id, Label = tag.Label, Translations = translated };
    }
}
