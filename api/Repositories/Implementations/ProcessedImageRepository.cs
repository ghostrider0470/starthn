using System.Runtime.CompilerServices;
using Api.Entities;
using Api.Repositories.Interfaces;
using Microsoft.Azure.Cosmos;
using System.Net;

namespace Api.Repositories.Implementations;

public class ProcessedImageRepository : IProcessedImageRepository
{
    private readonly Container _container;

    public ProcessedImageRepository(CosmosClient client)
    {
        _container = client.GetContainer("horizon", "processedImages");
    }

    public async Task UpsertAsync(
        ProcessedImageEntity entity,
        CancellationToken cancellationToken = default)
    {
        // id is computed from Path (Id => Path), partition key is also Path
        await _container.UpsertItemAsync(entity, new PartitionKey(entity.Path), cancellationToken: cancellationToken);
    }

    public async Task<ProcessedImageEntity?> GetByPathAsync(
        string path,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _container.ReadItemAsync<ProcessedImageEntity>(
                path, new PartitionKey(path), cancellationToken: cancellationToken);
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task DeleteAsync(
        string path,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _container.DeleteItemAsync<ProcessedImageEntity>(
                path, new PartitionKey(path), cancellationToken: cancellationToken);
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            // Already deleted — no-op
        }
    }

    public async IAsyncEnumerable<string> GetProcessedPathsAsync(
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var queryDef = new QueryDefinition("SELECT c.path FROM c WHERE (NOT IS_DEFINED(c._deleted) OR c._deleted = false)");
        using var iterator = _container.GetItemQueryIterator<PathProjection>(queryDef);
        while (iterator.HasMoreResults)
        {
            var page = await iterator.ReadNextAsync(cancellationToken);
            foreach (var item in page)
                yield return item.Path;
        }
    }

    private sealed class PathProjection
    {
        [System.Text.Json.Serialization.JsonPropertyName("path")]
        public string Path { get; set; } = string.Empty;
    }
}
