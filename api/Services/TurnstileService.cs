using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Api.Services;

public class TurnstileService : ITurnstileService
{
    private readonly HttpClient _httpClient;
    private readonly string _secretKey;
    private readonly ILogger<TurnstileService> _logger;

    public TurnstileService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<TurnstileService> logger)
    {
        _httpClient = httpClient;
        _secretKey = configuration["TURNSTILE_SECRET_KEY"]
            ?? throw new InvalidOperationException("TURNSTILE_SECRET_KEY is not configured.");
        _logger = logger;
    }

    public async Task<bool> VerifyTokenAsync(string token, string? remoteIp)
    {
        var payload = new Dictionary<string, string>
        {
            ["secret"] = _secretKey,
            ["response"] = token
        };

        if (!string.IsNullOrEmpty(remoteIp))
            payload["remoteip"] = remoteIp;

        var response = await _httpClient.PostAsync(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            new FormUrlEncodedContent(payload));

        var result = await response.Content.ReadFromJsonAsync<TurnstileResponse>();

        if (result?.Success != true)
        {
            _logger.LogWarning("Turnstile verification failed. Errors: {Errors}",
                string.Join(", ", result?.ErrorCodes ?? []));
        }

        return result?.Success == true;
    }

    private class TurnstileResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("error-codes")]
        public string[]? ErrorCodes { get; set; }
    }
}
