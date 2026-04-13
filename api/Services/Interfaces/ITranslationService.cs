using Api.DTOs.Blog;
using Api.Entities;

namespace Api.Services.Interfaces;

public interface ITranslationService
{
    Task<List<string>> TranslateTextsAsync(List<string> texts, string targetLang, string sourceLang = "en");
    Task<Dictionary<string, string>> TranslateToManyAsync(string text, IEnumerable<(string localeCode, string translatorCode)> targets, string sourceLang = "en");
    Task<BlogPostTranslation> TranslateBlogPostAsync(BlogPostEntity post, string targetLang);
    Task<Dictionary<string, BlogPostTranslation>> TranslateBlogPostBatchAsync(BlogPostEntity post, List<string> targetLangs);
    Task<UserPageTranslationEntity> TranslateUserPageAsync(UserEntity user, string targetLang);
}
