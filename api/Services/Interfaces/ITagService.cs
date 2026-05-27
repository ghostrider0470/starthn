using Api.DTOs.Tags;

namespace Api.Services.Interfaces;

public interface ITagService
{
    Task<List<TagResponse>> GetAllAsync();
    Task<TagResponse> CreateAsync(CreateTagRequest request);
    Task<TagResponse?> UpdateAsync(string id, UpdateTagRequest request);
    Task<TagResponse?> TranslateAsync(string id, IEnumerable<(string localeCode, string translatorCode)> targets, ITranslationService translationService, string? labelOverride = null, string sourceLang = "en");
    Task<bool> DeleteAsync(string id);
}
