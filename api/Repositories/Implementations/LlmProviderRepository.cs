using Api.Entities;
using Api.Repositories.Interfaces;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
using System.Net;

namespace Api.Repositories.Implementations;

public class LlmProviderRepository : ILlmProviderRepository
{
    private readonly Container _container;

    public LlmProviderRepository(CosmosClient client)
    {
        _container = client.GetContainer("horizon", "llmProviders");
    }

    public async Task<List<LlmProviderEntity>> GetAllAsync()
    {
        var query = _container.GetItemLinqQueryable<LlmProviderEntity>()
            .OrderBy(p => p.Name);
        using var iterator = query.ToFeedIterator();
        var results = new List<LlmProviderEntity>();
        while (iterator.HasMoreResults)
            results.AddRange(await iterator.ReadNextAsync());
        return results;
    }

    public async Task<LlmProviderEntity?> GetByKeyAsync(string key)
    {
        try
        {
            var response = await _container.ReadItemAsync<LlmProviderEntity>(key, new PartitionKey(key));
            if (response.Resource.IsDeleted) return null;
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<LlmProviderEntity?> GetByKeyEnabledAsync(string key)
    {
        try
        {
            var response = await _container.ReadItemAsync<LlmProviderEntity>(key, new PartitionKey(key));
            if (response.Resource.IsDeleted) return null;
            if (!response.Resource.IsEnabled) return null;
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task InsertAsync(LlmProviderEntity provider)
    {
        provider.Id = provider.Key;
        await _container.CreateItemAsync(provider, new PartitionKey(provider.Key));
    }

    public async Task<LlmProviderEntity> ReplaceAsync(LlmProviderEntity entity)
    {
        entity.UpdatedAt = DateTime.UtcNow;
        var response = await _container.ReplaceItemAsync(
            entity, entity.Id, new PartitionKey(entity.Key),
            new ItemRequestOptions { IfMatchEtag = entity.ETag });
        return response.Resource;
    }

    public async Task<bool> DeleteAsync(string key)
    {
        try
        {
            var response = await _container.ReadItemAsync<LlmProviderEntity>(key, new PartitionKey(key));
            var entity = response.Resource;
            entity.IsDeleted = true;
            entity.Ttl = 86400;
            await _container.UpsertItemAsync(entity, new PartitionKey(key));
            return true;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return false;
        }
    }
}
