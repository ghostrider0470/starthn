using Api.Entities;
using Api.Repositories.Interfaces;
using Microsoft.Azure.Cosmos;
using System.Net;

namespace Api.Repositories.Implementations;

public class LlmSettingsRepository : ILlmSettingsRepository
{
    private readonly Container _container;

    public LlmSettingsRepository(CosmosClient client)
    {
        _container = client.GetContainer("horizon", "llmSettings");
    }

    public async Task<LlmSettingsEntity?> GetAsync()
    {
        try
        {
            var response = await _container.ReadItemAsync<LlmSettingsEntity>("settings", new PartitionKey("settings"));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task UpsertAsync(LlmSettingsEntity settings)
    {
        settings.Id = "settings";
        await _container.UpsertItemAsync(settings, new PartitionKey("settings"));
    }
}
