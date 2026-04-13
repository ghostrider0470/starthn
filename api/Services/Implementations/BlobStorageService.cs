using Api.Services.Interfaces;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Blobs.Specialized;

namespace Api.Services.Implementations;

public class BlobStorageService : IBlobStorageService
{
    private readonly BlobServiceClient _serviceClient;

    public BlobStorageService()
    {
        var connectionString = Environment.GetEnvironmentVariable("BLOB_STORAGE_CONNECTION_STRING");
        _serviceClient = new BlobServiceClient(connectionString);
    }

    public async Task<string> UploadImageAsync(
        string container, string blobPath, Stream stream, string contentType)
    {
        var containerClient = _serviceClient.GetBlobContainerClient(container);
        await containerClient.CreateIfNotExistsAsync(PublicAccessType.Blob);

        var blobClient = containerClient.GetBlobClient(blobPath);
        var headers = new BlobHttpHeaders { ContentType = contentType };
        await blobClient.UploadAsync(stream, new BlobUploadOptions { HttpHeaders = headers });

        return blobClient.Uri.ToString();
    }

    public async Task UploadVariantAsync(
        string container,
        string blobPath,
        int width,
        byte[] webpData,
        CancellationToken cancellationToken = default)
    {
        var containerClient = _serviceClient.GetBlobContainerClient(container);
        var variantName = $"{blobPath}/w{width}.webp";
        var blobClient = containerClient.GetBlobClient(variantName);

        using var ms = new MemoryStream(webpData);
        var headers = new BlobHttpHeaders
        {
            ContentType = "image/webp",
            CacheControl = "public, max-age=31536000, immutable",
        };
        await blobClient.UploadAsync(
            ms,
            new BlobUploadOptions { HttpHeaders = headers },
            cancellationToken);
    }

    public async Task SetProcessedMetadataAsync(
        string container,
        string blobPath,
        string source,
        DateTime processedAt,
        CancellationToken cancellationToken = default)
    {
        var containerClient = _serviceClient.GetBlobContainerClient(container);
        var blobClient = containerClient.GetBlobClient(blobPath);
        var metadata = new Dictionary<string, string>
        {
            ["processed"] = "true",
            ["source"] = source,
            ["processedAt"] = processedAt.ToString("O"),
        };
        await blobClient.SetMetadataAsync(metadata, cancellationToken: cancellationToken);
    }

    public async Task DeleteBlobWithVariantsAsync(
        string container,
        string blobPath,
        CancellationToken cancellationToken = default)
    {
        var containerClient = _serviceClient.GetBlobContainerClient(container);

        var prefix = $"{blobPath}/w";
        await foreach (var blob in containerClient.GetBlobsAsync(
            BlobTraits.None, BlobStates.None, prefix, cancellationToken))
        {
            await containerClient.DeleteBlobIfExistsAsync(
                blob.Name, DeleteSnapshotsOption.IncludeSnapshots, cancellationToken: cancellationToken);
        }

        await containerClient.DeleteBlobIfExistsAsync(
            blobPath, DeleteSnapshotsOption.IncludeSnapshots, cancellationToken: cancellationToken);
    }
}
