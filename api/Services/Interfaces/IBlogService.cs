using Api.DTOs;
using Api.DTOs.Blog;
using Api.Entities;

namespace Api.Services.Interfaces;

public interface IBlogService
{
    Task<List<BlogPostResponse>> GetPublishedAsync(string? lang = null);
    Task<PaginatedResponse<BlogPostResponse>> GetPublishedPagedAsync(
        int page, int pageSize, string? lang = null, string? category = null,
        string? subcategory = null, string? tag = null, string? search = null);
    Task<BlogPostResponse?> GetBySlugAsync(string slug, string? lang = null);
    Task<List<string>> GetCategoriesAsync();
    Task<List<AdminBlogPostResponse>> GetAllAsync(string? filterAuthorId = null);
    Task<BlogPostEntity?> GetDocumentBySlugAsync(string slug);
    Task<AdminBlogPostResponse> CreateAsync(CreateBlogPostRequest request, string? authorId, string? authorName);
    Task<AdminBlogPostResponse?> UpdateAsync(string slug, UpdateBlogPostRequest request);
    Task<bool> DeleteAsync(string slug);
    Task<int> SeedAsync(List<CreateBlogPostRequest> posts, string? authorName);
    Task<Dictionary<string, int>> GetPostCountsByAuthorIdsAsync(IEnumerable<string> authorIds);
    Task<(long total, long published)> GetStatsAsync();
    Task<Dictionary<string, BlogPostTranslationEntity>?> TranslateAsync(string slug, List<string> languages, ITranslationService translationService);
    Task<BlogPostTranslationEntity?> UpdateTranslationAsync(string slug, string lang, UpdateTranslationRequest request);
    Task<Dictionary<string, BlogPostTranslationEntity>?> GetTranslationsAsync(string slug);
    Task<bool?> DeleteTranslationAsync(string slug, string lang);
}
