using Api.Entities;

namespace Api.Repositories.Interfaces;

public interface IProcessedImageRepository
{
    Task UpsertAsync(ProcessedImageEntity entity, CancellationToken cancellationToken = default);
    Task<ProcessedImageEntity?> GetByPathAsync(string path, CancellationToken cancellationToken = default);
    Task DeleteAsync(string path, CancellationToken cancellationToken = default);
    IAsyncEnumerable<string> GetProcessedPathsAsync(CancellationToken cancellationToken = default);
}
