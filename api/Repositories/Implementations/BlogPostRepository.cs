using Api.Entities;
using Api.Repositories.Interfaces;
using MongoDB.Driver;

namespace Api.Repositories.Implementations;

public class BlogPostRepository : IBlogPostRepository
{
    private readonly IMongoCollection<BlogPostEntity> _collection;

    public BlogPostRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<BlogPostEntity>("blogPosts");
    }

    public async Task<List<BlogPostEntity>> GetPublishedAsync() =>
        await _collection
            .Find(p => p.IsPublished)
            .SortByDescending(p => p.PublishedAt)
            .ToListAsync();

    public async Task<(List<BlogPostEntity> items, long totalCount)> GetPublishedPagedAsync(
        int page, int pageSize, string? category = null, string? subcategory = null,
        string? tag = null, string? search = null)
    {
        var builder = Builders<BlogPostEntity>.Filter;
        var filter = builder.Eq(p => p.IsPublished, true);

        if (!string.IsNullOrEmpty(category))
            filter &= builder.Eq(p => p.Category, category);

        if (!string.IsNullOrEmpty(subcategory))
            filter &= builder.Eq(p => p.Subcategory, subcategory);

        if (!string.IsNullOrEmpty(tag))
            filter &= builder.AnyEq(p => p.Tags, tag);

        if (!string.IsNullOrEmpty(search))
        {
            var regex = new MongoDB.Bson.BsonRegularExpression(search, "i");
            filter &= builder.Or(
                builder.Regex(p => p.Title, regex),
                builder.Regex(p => p.Excerpt, regex),
                builder.Regex(p => p.Author, regex));
        }

        var totalCount = await _collection.CountDocumentsAsync(filter);

        var items = await _collection
            .Find(filter)
            .SortByDescending(p => p.IsFeatured)
            .ThenByDescending(p => p.PublishedAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    public async Task<BlogPostEntity?> GetBySlugAsync(string slug, bool publishedOnly = false)
    {
        var filter = publishedOnly
            ? Builders<BlogPostEntity>.Filter.And(
                Builders<BlogPostEntity>.Filter.Eq(p => p.Slug, slug),
                Builders<BlogPostEntity>.Filter.Eq(p => p.IsPublished, true))
            : Builders<BlogPostEntity>.Filter.Eq(p => p.Slug, slug);

        return await _collection.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<List<BlogPostEntity>> GetAllAsync(string? filterAuthorId = null)
    {
        var filter = filterAuthorId != null
            ? Builders<BlogPostEntity>.Filter.Eq(p => p.AuthorId, filterAuthorId)
            : FilterDefinition<BlogPostEntity>.Empty;

        return await _collection
            .Find(filter)
            .SortByDescending(p => p.PublishedAt)
            .ToListAsync();
    }

    public async Task InsertAsync(BlogPostEntity post) =>
        await _collection.InsertOneAsync(post);

    public async Task<BlogPostEntity?> FindOneAndUpdateAsync(
        string slug, UpdateDefinition<BlogPostEntity> update) =>
        await _collection.FindOneAndUpdateAsync<BlogPostEntity>(
            p => p.Slug == slug,
            update,
            new FindOneAndUpdateOptions<BlogPostEntity, BlogPostEntity> { ReturnDocument = ReturnDocument.After });

    public async Task<bool> DeleteAsync(string slug)
    {
        var result = await _collection.DeleteOneAsync(p => p.Slug == slug);
        return result.DeletedCount > 0;
    }

    public async Task<long> CountAsync() =>
        await _collection.CountDocumentsAsync(FilterDefinition<BlogPostEntity>.Empty);

    public async Task<long> CountPublishedAsync() =>
        await _collection.CountDocumentsAsync(p => p.IsPublished);

    public async Task<Dictionary<string, int>> GetPostCountsByAuthorIdsAsync(IEnumerable<string> authorIds)
    {
        var filter = Builders<BlogPostEntity>.Filter.And(
            Builders<BlogPostEntity>.Filter.In(p => p.AuthorId, authorIds),
            Builders<BlogPostEntity>.Filter.Eq(p => p.IsPublished, true));

        var posts = await _collection.Find(filter).ToListAsync();
        return posts
            .Where(p => p.AuthorId != null)
            .GroupBy(p => p.AuthorId!)
            .ToDictionary(g => g.Key, g => g.Count());
    }

    public async Task UpdateManyAsync(
        FilterDefinition<BlogPostEntity> filter, UpdateDefinition<BlogPostEntity> update) =>
        await _collection.UpdateManyAsync(filter, update);
}
