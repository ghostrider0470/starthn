namespace Api.Services.Interfaces;

public interface IBlobStorageService
{
    Task<string> UploadImageAsync(string container, string blobPath, Stream stream, string contentType);

    Task UploadVariantAsync(
        string container,
        string blobPath,
        int width,
        byte[] webpData,
        CancellationToken cancellationToken = default);

    Task SetProcessedMetadataAsync(
        string container,
        string blobPath,
        string source,
        DateTime processedAt,
        CancellationToken cancellationToken = default);

    Task DeleteBlobWithVariantsAsync(
        string container,
        string blobPath,
        CancellationToken cancellationToken = default);
}
