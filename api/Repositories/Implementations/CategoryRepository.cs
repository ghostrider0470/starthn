using Api.Entities;
using Api.Repositories.Interfaces;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
using System.Net;

namespace Api.Repositories.Implementations;

public class CategoryRepository : ICategoryRepository
{
    private readonly Container _container;

    public CategoryRepository(CosmosClient client)
    {
        _container = client.GetContainer("horizon", "categories");
    }

    public async Task<List<CategoryEntity>> GetAllAsync()
    {
        var query = _container.GetItemLinqQueryable<CategoryEntity>()
            .OrderBy(c => c.Label);
        using var iterator = query.ToFeedIterator();
        var results = new List<CategoryEntity>();
        while (iterator.HasMoreResults)
            results.AddRange(await iterator.ReadNextAsync());
        return results;
    }

    public async Task<CategoryEntity?> GetBySlugAsync(string slug)
    {
        try
        {
            var response = await _container.ReadItemAsync<CategoryEntity>(slug, new PartitionKey(slug));
            if (response.Resource.IsDeleted) return null;
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task InsertAsync(CategoryEntity category)
    {
        category.Id = category.Slug;
        await _container.CreateItemAsync(category, new PartitionKey(category.Slug));
    }

    public async Task<CategoryEntity> ReplaceAsync(CategoryEntity entity)
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
            var response = await _container.ReadItemAsync<CategoryEntity>(slug, new PartitionKey(slug));
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
}
