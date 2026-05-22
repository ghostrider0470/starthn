using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;
using Azure.AI.OpenAI;
using Api.DTOs.Chat;
using Api.Services.Interfaces;
using Microsoft.Extensions.Logging;
using OpenAI.Chat;
using System.ClientModel;

namespace Api.Services.Implementations;

public class ChatService : IChatService
{
    private readonly HttpClient _http;
    private readonly ILlmProviderService _providerService;
    private readonly ILogger<ChatService> _logger;

    private static string BuildSystemPrompt(string? locale, string? pageContext) => $"""
        You are a friendly accounting advisor working at Start HN, an accounting agency based in Sarajevo, Bosnia and Herzegovina.

        About Start HN:
        - Focus: helping entrepreneurs, sole traders, small businesses, and growing companies keep finances clear, compliant, and predictable.
        - Services: bookkeeping, accounting, payroll, tax consulting, VAT/PDV registration and reporting, virtual CFO support, business consulting, and accounting education.
        - Typical work: monthly bookkeeping, financial reports, tax deadlines, payroll calculations, company setup support, advisory calls, and practical guidance for business owners.
        - Address: Ibrahima Ljubovica 47, Ilidza, Sarajevo Canton, Bosnia and Herzegovina.
        - Website: https://starthn.ba

        Your personality:
        - Friendly, precise, calm, and practical — like talking to an experienced accountant.
        - Not salesy or pushy. Be helpful and honest.
        - IMPORTANT: The user's website locale is "{locale ?? "en-US"}". Always respond in the language corresponding to this locale. For example: "bs-BA" = Bosnian and "en-US" = English. If the user writes in a different language, match their language instead.
        - Keep responses concise (2-4 sentences unless they ask for detail).
        - Do not invent legal deadlines, fees, or tax rules. If exact current law matters, explain that Start HN should confirm it directly.

        Page context:
        - The user is currently viewing: {pageContext ?? "unknown page"}.
        - Use this to give relevant answers. For example, if they're on a service page, focus on that accounting service.
        - Don't explicitly mention "I see you're on..." unless it's natural to do so.

        Conversation strategy:
        - Your primary goal is to be genuinely helpful AND capture lead information (name, email, company/business type) so the Start HN team can follow up.
        - After 2-3 exchanges, naturally ask what kind of business they run and what accounting problem they need help with.
        - Once they describe a need, offer a concrete next step: "If you want, leave your email and the Start HN team can suggest the right accounting package."
        - If they share an email, confirm it warmly and wrap up: "Perfect, the Start HN team will get back to you shortly."
        - If they decline, suggest /contact as a fallback — don't push again.
        - Never ask for email in your first response. Build rapport first.
        - After collecting lead info, gracefully wrap the conversation — don't keep chatting indefinitely.
        - If the conversation has gone 5+ exchanges without lead info, make one natural attempt: "If you'd like Start HN to review your situation, share your email and the team can follow up."
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

        var envReturnedTokens = false;
        await foreach (var token in StreamEnvAzureOpenAiAsync(messages, locale, pageContext, cancellationToken))
        {
            envReturnedTokens = true;
            yield return token;
        }
        if (envReturnedTokens)
        {
            yield break;
        }

        var stream = await TryDbProviderAsync(fullMessages, cancellationToken);
        if (stream != null)
        {
            await foreach (var token in StreamServerSentEventTokensAsync(stream, cancellationToken))
            {
                yield return token;
            }
            yield break;
        }

        stream = await TryNvidiaFallbackAsync(fullMessages, cancellationToken);
        if (stream != null)
        {
            await foreach (var token in StreamServerSentEventTokensAsync(stream, cancellationToken))
            {
                yield return token;
            }
            yield break;
        }

        yield return "I'm temporarily unavailable. Please try again later or visit our contact page at /contact.";
    }

    private static async IAsyncEnumerable<string> StreamServerSentEventTokensAsync(
        Stream stream,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        using var reader = new StreamReader(stream);
        while (!cancellationToken.IsCancellationRequested)
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

    private IAsyncEnumerable<string> StreamEnvAzureOpenAiAsync(
        List<ChatMessageDto> messages,
        string? locale,
        string? pageContext,
        CancellationToken ct = default)
    {
        var endpoint = Environment.GetEnvironmentVariable("CHAT_LLM_ENDPOINT");
        var deployment = Environment.GetEnvironmentVariable("CHAT_LLM_DEPLOYMENT");
        var apiKey = Environment.GetEnvironmentVariable("CHAT_LLM_API_KEY");

        if (string.IsNullOrEmpty(endpoint) || string.IsNullOrEmpty(deployment) || string.IsNullOrEmpty(apiKey))
            return EmptyAsyncEnumerable();

        var channel = Channel.CreateUnbounded<string>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = true,
        });

        _ = Task.Run(async () =>
        {
            try
            {
                _logger.LogInformation("Chat: using env Azure OpenAI ({Deployment})", deployment);

                var azureClient = new AzureOpenAIClient(
                    new Uri(endpoint),
                    new ApiKeyCredential(apiKey));
                var chatClient = azureClient.GetChatClient(deployment);

                var sdkMessages = BuildSdkMessages(messages, locale, pageContext);
                var completionUpdates = chatClient.CompleteChatStreamingAsync(sdkMessages, cancellationToken: ct);
                await foreach (var completionUpdate in completionUpdates)
                {
                    foreach (var contentPart in completionUpdate.ContentUpdate)
                    {
                        if (!string.IsNullOrEmpty(contentPart.Text))
                        {
                            await channel.Writer.WriteAsync(contentPart.Text, ct);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Chat: env Azure OpenAI failed, trying NVIDIA fallback");
            }
            finally
            {
                channel.Writer.TryComplete();
            }
        }, CancellationToken.None);

        return channel.Reader.ReadAllAsync(ct);
    }

    private static async IAsyncEnumerable<string> EmptyAsyncEnumerable()
    {
        await Task.CompletedTask;
        yield break;
    }

    private static List<ChatMessage> BuildSdkMessages(
        List<ChatMessageDto> messages,
        string? locale,
        string? pageContext)
    {
        var sdkMessages = new List<ChatMessage>
        {
            new SystemChatMessage(BuildSystemPrompt(locale, pageContext)),
        };

        foreach (var message in messages.TakeLast(20))
        {
            sdkMessages.Add(message.Role.ToLowerInvariant() switch
            {
                "assistant" => new AssistantChatMessage(message.Content),
                "system" => new SystemChatMessage(message.Content),
                _ => new UserChatMessage(message.Content),
            });
        }

        return sdkMessages;
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
