namespace Api.Services.Interfaces;

public interface IBlobStorageService
{
    Task<string> UploadImageAsync(Stream stream, string fileName, string contentType);
}
