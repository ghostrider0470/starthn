using Api.Entities;
using Api.Repositories.Interfaces;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
using System.Net;

namespace Api.Repositories.Implementations;

public class UserPageTranslationRepository : IUserPageTranslationRepository
{
    private readonly Container _container;

    public UserPageTranslationRepository(CosmosClient client)
    {
        _container = client.GetContainer("horizon", "userPageTranslations");
    }

    public async Task<UserPageTranslationEntity?> GetAsync(string userId, string lang)
    {
        try
        {
            var response = await _container.ReadItemAsync<UserPageTranslationEntity>(
                $"{userId}:{lang}", new PartitionKey(userId));
            if (response.Resource.IsDeleted) return null;
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<Dictionary<string, UserPageTranslationEntity>> GetAllForUserAsDictAsync(string userId)
    {
        var query = _container.GetItemLinqQueryable<UserPageTranslationEntity>(
            requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(userId) });
        using var iterator = query.ToFeedIterator();
        var results = new List<UserPageTranslationEntity>();
        while (iterator.HasMoreResults)
            results.AddRange(await iterator.ReadNextAsync());
        return results.ToDictionary(t => t.Lang);
    }

    public async Task UpsertAsync(UserPageTranslationEntity translation)
    {
        translation.Id = $"{translation.UserId}:{translation.Lang}";
        await _container.UpsertItemAsync(translation, new PartitionKey(translation.UserId));
    }

    public async Task DeleteAsync(string userId, string lang)
    {
        var response = await _container.ReadItemAsync<UserPageTranslationEntity>(
            $"{userId}:{lang}", new PartitionKey(userId));
        var entity = response.Resource;
        entity.IsDeleted = true;
        entity.Ttl = 86400;
        await _container.UpsertItemAsync(entity, new PartitionKey(userId));
    }
}
