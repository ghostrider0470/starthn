using System.Text.Json;

namespace Api.Services.Interfaces;

public interface IWorkerSyncService
{
    /// <summary>
    /// Push a batch of changed entities from the Cosmos Change Feed to the
    /// Worker's /api/internal/sync endpoint for D1 upsert.
    /// Retries with exponential backoff; throws on final failure so the
    /// trigger can retry the batch.
    /// </summary>
    Task SyncEntityAsync(string entityType, IReadOnlyList<JsonElement> items);

    /// <summary>
    /// Write-through: immediately sync one entity after a Cosmos write.
    /// Fire-and-forget safe — swallows all exceptions and logs warnings.
    /// </summary>
    Task TrySyncOneAsync<T>(string entityType, T item);

    /// <summary>
    /// Write-through: immediately push a delete tombstone after a Cosmos delete.
    /// Fire-and-forget safe — swallows all exceptions and logs warnings.
    /// </summary>
    Task TrySyncDeleteAsync(string entityType, string id);
}
