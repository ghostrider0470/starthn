using Api.Services.Interfaces;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace Api.Services.Implementations;

public class BlobStorageService : IBlobStorageService
{
    private readonly BlobContainerClient _container;

    public BlobStorageService()
    {
        var connectionString = Environment.GetEnvironmentVariable("BLOB_STORAGE_CONNECTION_STRING");
        var client = new BlobServiceClient(connectionString);
        _container = client.GetBlobContainerClient("blog-images");
    }

    public async Task<string> UploadImageAsync(Stream stream, string fileName, string contentType)
    {
        await _container.CreateIfNotExistsAsync(PublicAccessType.Blob);

        // Organize by year/month with a GUID prefix to prevent collisions
        var blobName = $"{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid():N}-{fileName}";
        var blobClient = _container.GetBlobClient(blobName);

        var headers = new BlobHttpHeaders { ContentType = contentType };
        await blobClient.UploadAsync(stream, new BlobUploadOptions { HttpHeaders = headers });

        return blobClient.Uri.ToString();
    }
}
