using Api.DTOs.Tags;
using Api.Services.Interfaces;

namespace Api.Services.Implementations;

public class TagService : ITagService
{
    public async Task<TagResponse?> TranslateAsync(
        string id,
        IEnumerable<(string localeCode, string translatorCode)> targets,
        ITranslationService translationService,
        string label,
        string sourceLang = "en",
        Api.DTOs.LlmReviewConfig? llmReview = null)
    {
        // The edge always supplies the label from D1 (source of truth); Cosmos is never read.
        var translated = await translationService.TranslateToManyAsync(label, targets, sourceLang);

        return new TagResponse { Id = id, Label = label, Translations = translated };
    }
}
