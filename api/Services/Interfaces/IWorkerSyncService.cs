using System.Text.Json;
using Api.Entities;

namespace Api.Services.Interfaces;

public interface IWorkerSyncService
{
    /// <summary>
    /// Sync a processed image manifest entry to the Cloudflare Worker D1
    /// cache. Fire-and-forget — failures are logged but not thrown.
    /// </summary>
    Task SyncAsync(ProcessedImageEntity entity, CancellationToken cancellationToken = default);

    /// <summary>
    /// Proactively warm the R2 cache for the two most-requested widths
    /// (800 and 1200). Fire-and-forget — failures are logged but not thrown.
    /// </summary>
    Task WarmAsync(string blobPath, int[] widths, string processedAt);

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
