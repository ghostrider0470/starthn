namespace Api.Services.Interfaces;

public record WebpVariant(int Width, byte[] Data);

public interface IImageProcessingService
{
    /// <summary>
    /// Load an image from the given stream and encode webp variants at the
    /// specified widths. Preserves aspect ratio and never upscales.
    /// </summary>
    Task<IReadOnlyList<WebpVariant>> GenerateWebpVariantsAsync(
        Stream source,
        IReadOnlyList<int> widths,
        int quality = 82,
        CancellationToken cancellationToken = default);
}
