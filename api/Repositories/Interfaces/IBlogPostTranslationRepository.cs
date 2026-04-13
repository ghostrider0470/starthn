using Api.Entities;

namespace Api.Repositories.Interfaces;

public interface IBlogPostTranslationRepository
{
    Task<BlogPostTranslationEntity?> GetAsync(string postSlug, string lang);
    Task<List<BlogPostTranslationEntity>> GetAllForPostAsync(string postSlug);
    Task<Dictionary<string, BlogPostTranslationEntity>> GetAllForPostAsDictAsync(string postSlug);
    Task UpsertAsync(BlogPostTranslationEntity translation);
    Task DeleteAsync(string postSlug, string lang);
    Task DeleteAllForPostAsync(string postSlug);
}
