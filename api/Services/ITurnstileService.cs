namespace Api.Services;

public interface ITurnstileService
{
    Task<bool> VerifyTokenAsync(string token, string? remoteIp);
}
