using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using Api.DTOs.Chat;
using Api.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Api.Services.Implementations;

public class ChatService : IChatService
{
    private readonly HttpClient _http;
    private readonly ILlmProviderService _providerService;
    private readonly ILogger<ChatService> _logger;

    private static string BuildSystemPrompt(string? locale, string? pageContext) => $"""
        You are a friendly tech expert working at Horizon Tech, an EU-based software consultancy headquartered in Sarajevo, Bosnia and Herzegovina.

        About Horizon Tech:
        - Services: Enterprise Software Development, AI/ML & Business Intelligence, Cloud Architecture, IoT & Edge Computing, DevOps & Platform Engineering, Digital Transformation
        - Tech stack: .NET, C#, React, TypeScript, Node.js, Python, Azure, AWS, Kubernetes, Docker, Terraform, PostgreSQL, MongoDB, and more
        - Team: 25+ engineers across 9+ countries, remote-first, CET timezone
        - Engagement model: Dedicated teams embedded in your workflow — not body-shopping. No account managers or ticket queues.
        - Website: https://www.horizon-tech.io

        Your personality:
        - Friendly, conversational, knowledgeable — like chatting with a senior engineer
        - Not salesy or pushy. Be helpful and honest.
        - IMPORTANT: The user's website locale is "{locale ?? "en-US"}". Always respond in the language corresponding to this locale. For example: "bs-BA" = Bosnian, "de-DE" = German, "fr-FR" = French, "ar-SA" = Arabic, etc. If the user writes in a different language, match their language instead.
        - Keep responses concise (2-4 sentences unless they ask for detail)

        Page context:
        - The user is currently viewing: {pageContext ?? "unknown page"}
        - Use this to give relevant answers. For example, if they're on a service page, focus on that service. If they're reading a blog post, reference the article topic.
        - Don't explicitly mention "I see you're on..." unless it's natural to do so.

        Lead capture:
        - When the user describes a concrete project need, budget, or timeline, naturally ask for their name and email so the team can follow up
        - If they decline, suggest visiting /contact instead
        - Never push or ask more than once per conversation
        """;

    public ChatService(HttpClient http, ILlmProviderService providerService, ILogger<ChatService> logger)
    {
        _http = http;
        _providerService = providerService;
        _logger = logger;
    }

    public async IAsyncEnumerable<string> StreamResponseAsync(
        List<ChatMessageDto> messages,
        string? locale = null,
        string? pageContext = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var fullMessages = new List<object>
        {
            new { role = "system", content = BuildSystemPrompt(locale, pageContext) }
        };
        fullMessages.AddRange(messages.TakeLast(20).Select(m => new { role = m.Role, content = m.Content }));

        var stream = await TryDbProviderAsync(fullMessages, cancellationToken)
            ?? await TryEnvProviderAsync(fullMessages, cancellationToken)
            ?? await TryNvidiaFallbackAsync(fullMessages, cancellationToken);

        if (stream == null)
        {
            yield return "I'm temporarily unavailable. Please try again later or visit our contact page at /contact.";
            yield break;
        }

        using var reader = new StreamReader(stream);
        while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (line == null) break;
            if (!line.StartsWith("data: ")) continue;

            var data = line["data: ".Length..];
            if (data == "[DONE]") break;

            var text = TryExtractContent(data);
            if (text != null)
            {
                yield return text;
            }
        }
    }

    private static string? TryExtractContent(string data)
    {
        try
        {
            using var doc = JsonDocument.Parse(data);
            var delta = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("delta");

            if (delta.TryGetProperty("content", out var content))
                return content.GetString();
        }
        catch { /* skip malformed chunks */ }
        return null;
    }

    private async Task<Stream?> TryDbProviderAsync(List<object> messages, CancellationToken ct)
    {
        try
        {
            var (provider, model) = await _providerService.GetChatActiveAsync();
            if (provider == null || model == null)
                return null;

            var apiType = model.Api ?? provider.Api;
            _logger.LogInformation("Chat: using DB provider {Key}/{Model} ({Api})", provider.Key, model.Id, apiType);

            return apiType == "anthropic-messages"
                ? await StreamAnthropicAsync(provider.BaseUrl, provider.ApiKey, model.Id, model.MaxTokens, provider.Headers, messages, ct)
                : await StreamOpenAiCompatibleAsync(provider.BaseUrl, provider.ApiKey, model.Id, provider.Headers, messages, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Chat: DB provider failed, trying env fallback");
            return null;
        }
    }

    private async Task<Stream?> TryEnvProviderAsync(List<object> messages, CancellationToken ct)
    {
        var endpoint = Environment.GetEnvironmentVariable("CHAT_LLM_ENDPOINT");
        var deployment = Environment.GetEnvironmentVariable("CHAT_LLM_DEPLOYMENT");
        var apiKey = Environment.GetEnvironmentVariable("CHAT_LLM_API_KEY");

        if (string.IsNullOrEmpty(endpoint) || string.IsNullOrEmpty(deployment) || string.IsNullOrEmpty(apiKey))
            return null;

        try
        {
            _logger.LogInformation("Chat: using env Azure OpenAI ({Deployment})", deployment);
            var url = $"{endpoint.TrimEnd('/')}/openai/deployments/{deployment}/chat/completions?api-version=2024-10-21";

            var body = new { messages, stream = true };
            var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
            };
            request.Headers.Add("api-key", apiKey);

            var response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStreamAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Chat: env Azure OpenAI failed, trying NVIDIA fallback");
            return null;
        }
    }

    private async Task<Stream?> TryNvidiaFallbackAsync(List<object> messages, CancellationToken ct)
    {
        var apiKey = Environment.GetEnvironmentVariable("NVIDIA_API_KEY");
        if (string.IsNullOrEmpty(apiKey)) return null;

        try
        {
            _logger.LogInformation("Chat: using NVIDIA fallback");
            var url = "https://integrate.api.nvidia.com/v1/chat/completions";
            var body = new
            {
                model = "z-ai/glm5",
                messages,
                stream = true,
                temperature = 1,
                top_p = 1,
                max_tokens = 16384,
            };

            var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStreamAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Chat: NVIDIA fallback also failed");
            return null;
        }
    }

    private async Task<Stream?> StreamAnthropicAsync(
        string baseUrl, string apiKey, string model, int maxTokens,
        Dictionary<string, string> headers, List<object> messages, CancellationToken ct)
    {
        var msgPath = baseUrl.TrimEnd('/').EndsWith("/v1", StringComparison.OrdinalIgnoreCase)
            ? $"{baseUrl.TrimEnd('/')}/messages"
            : $"{baseUrl.TrimEnd('/')}/v1/messages";

        var systemMsg = messages.FirstOrDefault()?.GetType().GetProperty("content")?.GetValue(messages[0]) as string ?? "";
        var userMessages = messages.Skip(1).ToList();

        var body = new
        {
            model,
            max_tokens = maxTokens,
            system = systemMsg,
            messages = userMessages,
            stream = true,
        };

        var request = new HttpRequestMessage(HttpMethod.Post, msgPath)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
        };
        request.Headers.Add("x-api-key", apiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");
        foreach (var (k, v) in headers)
            if (k != "anthropic-version") request.Headers.TryAddWithoutValidation(k, v);

        var response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStreamAsync(ct);
    }

    private async Task<Stream?> StreamOpenAiCompatibleAsync(
        string baseUrl, string apiKey, string model,
        Dictionary<string, string> headers, List<object> messages, CancellationToken ct)
    {
        var chatPath = baseUrl.TrimEnd('/').EndsWith("/v1", StringComparison.OrdinalIgnoreCase)
            ? $"{baseUrl.TrimEnd('/')}/chat/completions"
            : $"{baseUrl.TrimEnd('/')}/v1/chat/completions";

        var body = new { model, messages, stream = true };

        var request = new HttpRequestMessage(HttpMethod.Post, chatPath)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        foreach (var (k, v) in headers)
            request.Headers.TryAddWithoutValidation(k, v);

        var response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStreamAsync(ct);
    }
}
