using Api.Entities;
using Api.Repositories.Interfaces;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
using System.Net;

namespace Api.Repositories.Implementations;

public class BlogPostRepository : IBlogPostRepository
{
    private readonly Container _container;

    public BlogPostRepository(CosmosClient client)
    {
        _container = client.GetContainer("horizon", "blogPosts");
    }

    public async Task<List<BlogPostEntity>> GetPublishedAsync()
    {
        var query = _container.GetItemLinqQueryable<BlogPostEntity>()
            .Where(p => p.IsPublished)
            .OrderByDescending(p => p.PublishedAt);
        using var iterator = query.ToFeedIterator();
        var results = new List<BlogPostEntity>();
        while (iterator.HasMoreResults)
            results.AddRange(await iterator.ReadNextAsync());
        return results;
    }

    public async Task<(List<BlogPostEntity> items, long totalCount)> GetPublishedPagedAsync(
        int page, int pageSize, string? category = null, string? subcategory = null,
        string? tag = null, string? search = null)
    {
        // Build WHERE clauses dynamically
        var conditions = new List<string> { "c.isPublished = true", "(NOT IS_DEFINED(c._deleted) OR c._deleted = false)" };

        if (!string.IsNullOrEmpty(category))
            conditions.Add("c.category = @category");
        if (!string.IsNullOrEmpty(subcategory))
            conditions.Add("c.subcategory = @subcategory");
        if (!string.IsNullOrEmpty(tag))
            conditions.Add("ARRAY_CONTAINS(c.tags, @tag)");
        if (!string.IsNullOrEmpty(search))
            conditions.Add("(CONTAINS(UPPER(c.title), UPPER(@search)) OR CONTAINS(UPPER(c.excerpt), UPPER(@search)) OR CONTAINS(UPPER(c.author), UPPER(@search)))");

        var where = string.Join(" AND ", conditions);

        var countSql = $"SELECT VALUE COUNT(1) FROM c WHERE {where}";
        var itemsSql = $"SELECT * FROM c WHERE {where} ORDER BY c.isFeatured DESC, c.publishedAt DESC OFFSET @offset LIMIT @limit";

        var countDef = new QueryDefinition(countSql);
        var itemsDef = new QueryDefinition(itemsSql)
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);

        if (!string.IsNullOrEmpty(category))
        {
            countDef = countDef.WithParameter("@category", category);
            itemsDef = itemsDef.WithParameter("@category", category);
        }
        if (!string.IsNullOrEmpty(subcategory))
        {
            countDef = countDef.WithParameter("@subcategory", subcategory);
            itemsDef = itemsDef.WithParameter("@subcategory", subcategory);
        }
        if (!string.IsNullOrEmpty(tag))
        {
            countDef = countDef.WithParameter("@tag", tag);
            itemsDef = itemsDef.WithParameter("@tag", tag);
        }
        if (!string.IsNullOrEmpty(search))
        {
            countDef = countDef.WithParameter("@search", search);
            itemsDef = itemsDef.WithParameter("@search", search);
        }

        using var countIterator = _container.GetItemQueryIterator<int>(countDef);
        var countPage = await countIterator.ReadNextAsync();
        var totalCount = (long)countPage.FirstOrDefault();

        using var iterator = _container.GetItemQueryIterator<BlogPostEntity>(itemsDef);
        var results = new List<BlogPostEntity>();
        while (iterator.HasMoreResults)
            results.AddRange(await iterator.ReadNextAsync());

        return (results, totalCount);
    }

    public async Task<BlogPostEntity?> GetBySlugAsync(string slug, bool publishedOnly = false)
    {
        try
        {
            var response = await _container.ReadItemAsync<BlogPostEntity>(slug, new PartitionKey(slug));
            if (response.Resource.IsDeleted) return null;
            if (publishedOnly && !response.Resource.IsPublished) return null;
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<List<BlogPostEntity>> GetAllAsync(string? filterAuthorId = null)
    {
        IQueryable<BlogPostEntity> query = _container.GetItemLinqQueryable<BlogPostEntity>()
            .OrderByDescending(p => p.PublishedAt);
        if (filterAuthorId != null)
            query = query.Where(p => p.AuthorId == filterAuthorId);
        using var iterator = query.ToFeedIterator();
        var results = new List<BlogPostEntity>();
        while (iterator.HasMoreResults)
            results.AddRange(await iterator.ReadNextAsync());
        return results;
    }

    public async Task InsertAsync(BlogPostEntity post)
    {
        post.Id = post.Slug;
        await _container.CreateItemAsync(post, new PartitionKey(post.Slug));
    }

    public async Task<BlogPostEntity> ReplaceAsync(BlogPostEntity entity)
    {
        entity.UpdatedAt = DateTime.UtcNow;
        var response = await _container.ReplaceItemAsync(
            entity, entity.Id, new PartitionKey(entity.Slug),
            new ItemRequestOptions { IfMatchEtag = entity.ETag });
        return response.Resource;
    }

    public async Task<bool> DeleteAsync(string slug)
    {
        try
        {
            var response = await _container.ReadItemAsync<BlogPostEntity>(slug, new PartitionKey(slug));
            var entity = response.Resource;
            entity.IsDeleted = true;
            entity.Ttl = 86400;
            await _container.UpsertItemAsync(entity, new PartitionKey(slug));
            return true;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    public async Task<long> CountAsync()
    {
        var query = new QueryDefinition("SELECT VALUE COUNT(1) FROM c WHERE (NOT IS_DEFINED(c._deleted) OR c._deleted = false)");
        using var iterator = _container.GetItemQueryIterator<int>(query);
        var page = await iterator.ReadNextAsync();
        return page.FirstOrDefault();
    }

    public async Task<long> CountPublishedAsync()
    {
        var query = new QueryDefinition("SELECT VALUE COUNT(1) FROM c WHERE c.isPublished = true AND (NOT IS_DEFINED(c._deleted) OR c._deleted = false)");
        using var iterator = _container.GetItemQueryIterator<int>(query);
        var page = await iterator.ReadNextAsync();
        return page.FirstOrDefault();
    }

    public async Task<Dictionary<string, int>> GetPostCountsByAuthorIdsAsync(IEnumerable<string> authorIds)
    {
        var ids = authorIds.ToList();
        if (ids.Count == 0) return new Dictionary<string, int>();

        // Build IN clause with individual parameters
        var paramNames = ids.Select((_, i) => $"@id{i}").ToList();
        var inClause = string.Join(", ", paramNames);
        var sql = $"SELECT * FROM c WHERE c.authorId IN ({inClause}) AND c.isPublished = true AND (NOT IS_DEFINED(c._deleted) OR c._deleted = false)";

        var queryDef = new QueryDefinition(sql);
        for (int i = 0; i < ids.Count; i++)
            queryDef = queryDef.WithParameter($"@id{i}", ids[i]);

        using var iterator = _container.GetItemQueryIterator<BlogPostEntity>(queryDef);
        var results = new List<BlogPostEntity>();
        while (iterator.HasMoreResults)
            results.AddRange(await iterator.ReadNextAsync());

        return results
            .Where(p => p.AuthorId != null)
            .GroupBy(p => p.AuthorId!)
            .ToDictionary(g => g.Key, g => g.Count());
    }

    public async Task UpdateAuthorOnPostsAsync(string authorId, string newAuthorName)
    {
        // Fetch all posts by this author and replace them with updated author name
        var queryDef = new QueryDefinition("SELECT * FROM c WHERE c.authorId = @authorId AND (NOT IS_DEFINED(c._deleted) OR c._deleted = false)")
            .WithParameter("@authorId", authorId);
        using var iterator = _container.GetItemQueryIterator<BlogPostEntity>(queryDef);
        var tasks = new List<Task>();
        while (iterator.HasMoreResults)
        {
            var page = await iterator.ReadNextAsync();
            foreach (var post in page)
            {
                post.Author = newAuthorName;
                post.UpdatedAt = DateTime.UtcNow;
                tasks.Add(_container.ReplaceItemAsync(post, post.Id, new PartitionKey(post.Slug)));
            }
        }
        await Task.WhenAll(tasks);
    }
}
