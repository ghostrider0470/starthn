using Api.DTOs.Chat;

namespace Api.Services.Interfaces;

public interface IChatService
{
    IAsyncEnumerable<string> StreamResponseAsync(List<ChatMessageDto> messages, string? locale = null, string? pageContext = null, CancellationToken cancellationToken = default);
}
