using Api.Entities;
using Api.Repositories.Interfaces;
using MongoDB.Driver;

namespace Api.Repositories.Implementations;

public class LlmProviderRepository : ILlmProviderRepository
{
    private readonly IMongoCollection<LlmProviderEntity> _collection;

    public LlmProviderRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<LlmProviderEntity>("llmProviders");
    }

    public async Task<List<LlmProviderEntity>> GetAllAsync() =>
        await _collection
            .Find(FilterDefinition<LlmProviderEntity>.Empty)
            .SortBy(p => p.Name)
            .ToListAsync();

    public async Task<LlmProviderEntity?> GetByKeyAsync(string key) =>
        await _collection.Find(p => p.Key == key).FirstOrDefaultAsync();

    public async Task<LlmProviderEntity?> GetByKeyEnabledAsync(string key) =>
        await _collection.Find(p => p.Key == key && p.IsEnabled).FirstOrDefaultAsync();

    public async Task InsertAsync(LlmProviderEntity provider) =>
        await _collection.InsertOneAsync(provider);

    public async Task<LlmProviderEntity?> FindOneAndUpdateAsync(
        string key, UpdateDefinition<LlmProviderEntity> update) =>
        await _collection.FindOneAndUpdateAsync<LlmProviderEntity>(
            p => p.Key == key,
            update,
            new FindOneAndUpdateOptions<LlmProviderEntity, LlmProviderEntity> { ReturnDocument = ReturnDocument.After });

    public async Task<bool> DeleteAsync(string key)
    {
        var result = await _collection.DeleteOneAsync(p => p.Key == key);
        return result.DeletedCount > 0;
    }
}
