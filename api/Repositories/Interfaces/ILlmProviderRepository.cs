using Api.Entities;
using MongoDB.Driver;

namespace Api.Repositories.Interfaces;

public interface ILlmProviderRepository
{
    Task<List<LlmProviderEntity>> GetAllAsync();
    Task<LlmProviderEntity?> GetByKeyAsync(string key);
    Task<LlmProviderEntity?> GetByKeyEnabledAsync(string key);
    Task InsertAsync(LlmProviderEntity provider);
    Task<LlmProviderEntity?> FindOneAndUpdateAsync(string key, UpdateDefinition<LlmProviderEntity> update);
    Task<bool> DeleteAsync(string key);
}
