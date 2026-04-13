using Api.Entities;

namespace Api.Repositories.Interfaces;

public interface ILlmProviderRepository
{
    Task<List<LlmProviderEntity>> GetAllAsync();
    Task<LlmProviderEntity?> GetByKeyAsync(string key);
    Task<LlmProviderEntity?> GetByKeyEnabledAsync(string key);
    Task InsertAsync(LlmProviderEntity provider);
    Task<LlmProviderEntity> ReplaceAsync(LlmProviderEntity entity);
    Task<bool> DeleteAsync(string key);
}
