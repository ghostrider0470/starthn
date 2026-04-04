using Api.Entities;

namespace Api.Repositories.Interfaces;

public interface ILlmSettingsRepository
{
    Task<LlmSettingsEntity?> GetAsync();
    Task UpsertAsync(LlmSettingsEntity settings);
}
