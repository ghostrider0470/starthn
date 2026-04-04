using Api.Entities;
using Api.Repositories.Interfaces;
using MongoDB.Driver;

namespace Api.Repositories.Implementations;

public class LlmSettingsRepository : ILlmSettingsRepository
{
    private readonly IMongoCollection<LlmSettingsEntity> _collection;

    public LlmSettingsRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<LlmSettingsEntity>("llmSettings");
    }

    public async Task<LlmSettingsEntity?> GetAsync() =>
        await _collection.Find(s => s.Id == "settings").FirstOrDefaultAsync();

    public async Task UpsertAsync(LlmSettingsEntity settings) =>
        await _collection.ReplaceOneAsync(
            s => s.Id == "settings",
            settings,
            new ReplaceOptions { IsUpsert = true });
}
