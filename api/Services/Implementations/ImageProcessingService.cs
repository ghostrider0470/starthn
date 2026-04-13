using Api.Services.Interfaces;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace Api.Services.Implementations;

public class ImageProcessingService : IImageProcessingService
{
    public async Task<IReadOnlyList<WebpVariant>> GenerateWebpVariantsAsync(
        Stream source,
        IReadOnlyList<int> widths,
        int quality = 82,
        CancellationToken cancellationToken = default)
    {
        using var image = await Image.LoadAsync(source, cancellationToken);

        var results = new List<WebpVariant>(widths.Count);
        var encoder = new WebpEncoder
        {
            Quality = quality,
            FileFormat = WebpFileFormatType.Lossy,
            Method = WebpEncodingMethod.Default,
        };

        foreach (var width in widths)
        {
            // Only downscale — never upscale
            var targetWidth = Math.Min(width, image.Width);
            using var clone = image.Clone(ctx => ctx.Resize(new ResizeOptions
            {
                Size = new Size(targetWidth, 0),
                Mode = ResizeMode.Max,
                Sampler = KnownResamplers.Lanczos3,
            }));

            using var ms = new MemoryStream();
            await clone.SaveAsWebpAsync(ms, encoder, cancellationToken);
            results.Add(new WebpVariant(width, ms.ToArray()));
        }

        return results;
    }
}
