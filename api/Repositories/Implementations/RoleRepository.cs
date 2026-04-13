using Api.Entities;
using Api.Repositories.Interfaces;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
using System.Net;

namespace Api.Repositories.Implementations;

public class RoleRepository : IRoleRepository
{
    private readonly Container _container;

    public RoleRepository(CosmosClient client)
    {
        _container = client.GetContainer("horizon", "roles");
    }

    public async Task<List<RoleEntity>> GetAllAsync()
    {
        var query = _container.GetItemLinqQueryable<RoleEntity>()
            .OrderBy(r => r.Name);
        using var iterator = query.ToFeedIterator();
        var results = new List<RoleEntity>();
        while (iterator.HasMoreResults)
            results.AddRange(await iterator.ReadNextAsync());
        return results;
    }

    public async Task<RoleEntity?> GetByNameAsync(string name)
    {
        try
        {
            var response = await _container.ReadItemAsync<RoleEntity>(name, new PartitionKey(name));
            if (response.Resource.IsDeleted) return null;
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task InsertAsync(RoleEntity role)
    {
        role.Id = role.Name;
        await _container.CreateItemAsync(role, new PartitionKey(role.Name));
    }

    public async Task InsertManyAsync(IEnumerable<RoleEntity> roles)
    {
        var tasks = roles.Select(r =>
        {
            r.Id = r.Name;
            return _container.CreateItemAsync(r, new PartitionKey(r.Name));
        });
        await Task.WhenAll(tasks);
    }

    public async Task<RoleEntity> ReplaceAsync(RoleEntity entity)
    {
        entity.UpdatedAt = DateTime.UtcNow;
        var response = await _container.ReplaceItemAsync(
            entity, entity.Id, new PartitionKey(entity.Name),
            new ItemRequestOptions { IfMatchEtag = entity.ETag });
        return response.Resource;
    }

    public async Task<bool> DeleteAsync(string name)
    {
        try
        {
            var response = await _container.ReadItemAsync<RoleEntity>(name, new PartitionKey(name));
            var entity = response.Resource;
            entity.IsDeleted = true;
            entity.Ttl = 86400;
            await _container.UpsertItemAsync(entity, new PartitionKey(name));
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
}
