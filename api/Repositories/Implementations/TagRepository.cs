using Api.Entities;
using Api.Repositories.Interfaces;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
using System.Net;

namespace Api.Repositories.Implementations;

public class TagRepository : ITagRepository
{
    private readonly Container _container;

    public TagRepository(CosmosClient client)
    {
        _container = client.GetContainer("horizon", "tags");
    }

    public async Task<List<TagEntity>> GetAllAsync()
    {
        var query = _container.GetItemLinqQueryable<TagEntity>()
            .OrderBy(t => t.Label);
        using var iterator = query.ToFeedIterator();
        var results = new List<TagEntity>();
        while (iterator.HasMoreResults)
            results.AddRange(await iterator.ReadNextAsync());
        return results;
    }

    public async Task<TagEntity?> GetBySlugAsync(string slug)
    {
        try
        {
            var response = await _container.ReadItemAsync<TagEntity>(slug, new PartitionKey(slug));
            if (response.Resource.IsDeleted) return null;
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task InsertAsync(TagEntity tag)
    {
        tag.Id = tag.Slug;
        await _container.CreateItemAsync(tag, new PartitionKey(tag.Slug));
    }

    public async Task<TagEntity> ReplaceAsync(TagEntity entity)
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
            var response = await _container.ReadItemAsync<TagEntity>(slug, new PartitionKey(slug));
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
