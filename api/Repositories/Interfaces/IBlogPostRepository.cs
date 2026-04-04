using Api.Entities;
using MongoDB.Driver;

namespace Api.Repositories.Interfaces;

public interface IBlogPostRepository
{
    Task<List<BlogPostEntity>> GetPublishedAsync();
    Task<(List<BlogPostEntity> items, long totalCount)> GetPublishedPagedAsync(
        int page, int pageSize, string? category = null, string? subcategory = null,
        string? tag = null, string? search = null);
    Task<BlogPostEntity?> GetBySlugAsync(string slug, bool publishedOnly = false);
    Task<List<BlogPostEntity>> GetAllAsync(string? filterAuthorId = null);
    Task InsertAsync(BlogPostEntity post);
    Task<BlogPostEntity?> FindOneAndUpdateAsync(string slug, UpdateDefinition<BlogPostEntity> update);
    Task<bool> DeleteAsync(string slug);
    Task<long> CountAsync();
    Task<long> CountPublishedAsync();
    Task<Dictionary<string, int>> GetPostCountsByAuthorIdsAsync(IEnumerable<string> authorIds);
    Task UpdateManyAsync(FilterDefinition<BlogPostEntity> filter, UpdateDefinition<BlogPostEntity> update);
}
