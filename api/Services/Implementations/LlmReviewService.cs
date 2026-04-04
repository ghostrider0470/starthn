using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Api.Entities;
using Api.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Api.Services.Implementations;

/// <summary>
/// Reviews machine translations using a configurable LLM provider stored in MongoDB.
/// Provider selection (provider key + model ID) is managed via the admin panel.
/// Supports "anthropic-messages" and "openai-completions" API types.
/// Active config is cached for 5 minutes to avoid a DB hit on every locale review.
/// </summary>
public class LlmReviewService : ILlmReviewService
{
    private readonly HttpClient _http;
    private readonly ILlmProviderService _providerService;
    private readonly ILogger<LlmReviewService> _logger;

    // 5-minute cache so every per-locale call doesn't hit MongoDB
    private ILlmProvider? _cachedProvider;
    private SemaphoreSlim _semaphore = new(6, 6);
    private DateTime _cacheExpiry = DateTime.MinValue;
    private readonly SemaphoreSlim _cacheLock = new(1, 1);

    public LlmReviewService(HttpClient http, ILlmProviderService providerService, ILogger<LlmReviewService> logger)
    {
        _http = http;
        _providerService = providerService;
        _logger = logger;
    }

    public bool IsEnabled => _cachedProvider?.IsEnabled ?? false;

    /// <summary>
    /// Reviews a single machine-translated text for a given locale.
    /// Returns the original if the provider is disabled or fails.
    /// </summary>
    public async Task<string> ReviewAsync(string original, string translated, string localeCode)
    {
        var provider = await GetProviderAsync();
        if (provider == null || !provider.IsEnabled || string.IsNullOrWhiteSpace(translated))
            return translated;

        await _semaphore.WaitAsync();
        try
        {
            var languageName = LocaleName(localeCode);
            var result = await provider.ReviewTranslationAsync(original, translated, languageName, localeCode);
            _logger.LogDebug("[{Locale}] reviewed: {Preview}", localeCode, result[..Math.Min(80, result.Length)]);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "LLM review failed for {Locale} — keeping machine translation", localeCode);
            return translated;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    /// <summary>
    /// Reviews all locale → translation pairs in parallel, each individually.
    /// Concurrency is bounded by the setting stored in DB.
    /// </summary>
    public async Task<Dictionary<string, string>> ReviewManyAsync(string original, Dictionary<string, string> translations)
    {
        var provider = await GetProviderAsync();
        if (provider == null || !provider.IsEnabled)
            return translations;

        var tasks = translations.Select(async kvp =>
        {
            var reviewed = await ReviewAsync(original, kvp.Value, kvp.Key);
            return (kvp.Key, reviewed);
        });

        var results = await Task.WhenAll(tasks);
        return results.ToDictionary(r => r.Key, r => r.reviewed);
    }

    // ── Cache refresh ─────────────────────────────────────────────────────────

    private async Task<ILlmProvider?> GetProviderAsync()
    {
        if (_cachedProvider != null && DateTime.UtcNow < _cacheExpiry)
            return _cachedProvider;

        await _cacheLock.WaitAsync();
        try
        {
            // Double-check after acquiring lock
            if (_cachedProvider != null && DateTime.UtcNow < _cacheExpiry)
                return _cachedProvider;

            var (providerDoc, modelEntry) = await _providerService.GetActiveAsync();

            if (providerDoc == null || modelEntry == null)
            {
                _cachedProvider = null;
                _cacheExpiry = DateTime.UtcNow.AddMinutes(1); // retry in 1 min if nothing configured
                return null;
            }

            var apiType = modelEntry.Api ?? providerDoc.Api;
            var concurrency = (await _providerService.GetSettingsAsync()).Concurrency;
            _semaphore = new SemaphoreSlim(concurrency, concurrency);

            _cachedProvider = apiType == "anthropic-messages"
                ? new AnthropicProvider(_http, providerDoc, modelEntry, _logger)
                : new OpenAiCompatibleProvider(_http, providerDoc, modelEntry, _logger);

            _cacheExpiry = DateTime.UtcNow.AddMinutes(5);

            _logger.LogInformation(
                "LLM review active: provider={Provider} model={Model} api={Api} concurrency={Concurrency}",
                providerDoc.Key, modelEntry.Id, apiType, concurrency);

            return _cachedProvider;
        }
        finally
        {
            _cacheLock.Release();
        }
    }

    // ── Locale display name ───────────────────────────────────────────────────

    private static string LocaleName(string locale) => locale switch
    {
        "en-US" => "English (United States)",
        "en-GB" => "English (United Kingdom)",
        "bs-BA" => "Bosnian",
        "ar-SA" => "Arabic (Saudi Arabia)",
        "fr-FR" => "French",
        "fr-CA" => "French (Canada)",
        "de-DE" => "German",
        "es-ES" => "Spanish (Spain)",
        "es-MX" => "Spanish (Mexico)",
        "es-419" => "Spanish (Latin America)",
        "pt-PT" => "Portuguese (Portugal)",
        "pt-BR" => "Portuguese (Brazil)",
        "it-IT" => "Italian",
        "nl-NL" => "Dutch",
        "pl-PL" => "Polish",
        "cs-CZ" => "Czech",
        "sk-SK" => "Slovak",
        "hr-HR" => "Croatian",
        "sr-RS" => "Serbian",
        "sl-SI" => "Slovenian",
        "ro-RO" => "Romanian",
        "bg-BG" => "Bulgarian",
        "uk-UA" => "Ukrainian",
        "ru-RU" => "Russian",
        "tr-TR" => "Turkish",
        "el-GR" => "Greek",
        "hu-HU" => "Hungarian",
        "fi-FI" => "Finnish",
        "sv-SE" => "Swedish",
        "da-DK" => "Danish",
        "nb-NO" => "Norwegian",
        "ja-JP" => "Japanese",
        "ko-KR" => "Korean",
        "zh-CN" => "Chinese (Simplified)",
        "zh-TW" => "Chinese (Traditional)",
        "vi-VN" => "Vietnamese",
        "th-TH" => "Thai",
        "id-ID" => "Indonesian",
        "ms-MY" => "Malay",
        "hi-IN" => "Hindi",
        "he-IL" => "Hebrew",
        "fa-IR" => "Persian",
        "sw-KE" => "Swahili",
        _ => locale,
    };
}

// ── Provider interface ────────────────────────────────────────────────────────

internal interface ILlmProvider
{
    bool IsEnabled { get; }
    Task<string> ReviewTranslationAsync(string original, string translated, string languageName, string localeCode);
}

// ── Shared prompt ─────────────────────────────────────────────────────────────

internal static class TranslationReviewPrompt
{
    internal static string Build(string original, string translated, string languageName, string localeCode) => $"""
        You are a professional translator and linguistic quality reviewer specializing in tech-industry content.

        Review the machine translation below and return a corrected version.

        Source language: English
        Target language: {languageName} ({localeCode})

        Original (English):
        {original}

        Machine translation:
        {translated}

        Check for:
        - Accuracy: does it faithfully convey the original meaning?
        - Naturalness: does it read like a native speaker wrote it?
        - Technical terminology: are terms appropriate for a tech audience in this locale?
        - Tone: is the professional tone preserved?

        Return ONLY the corrected translation — no explanation, no commentary, no quotation marks.
        If the machine translation is already excellent, return it unchanged.
        """;
}

// ── Anthropic provider ────────────────────────────────────────────────────────

internal sealed class AnthropicProvider : ILlmProvider
{
    private readonly HttpClient _http;
    private readonly string _baseUrl;
    private readonly string _apiKey;
    private readonly string _model;
    private readonly Dictionary<string, string> _extraHeaders;
    private readonly int _maxTokens;
    private readonly ILogger _logger;

    public bool IsEnabled => !string.IsNullOrEmpty(_apiKey);

    public AnthropicProvider(HttpClient http, LlmProviderEntity provider, LlmModelEntry model, ILogger logger)
    {
        _http = http;
        _baseUrl = provider.BaseUrl.TrimEnd('/');
        _apiKey = provider.ApiKey;
        _model = model.Id;
        _maxTokens = model.MaxTokens;
        _extraHeaders = provider.Headers;
        _logger = logger;
    }

    public async Task<string> ReviewTranslationAsync(string original, string translated, string languageName, string localeCode)
    {
        var requestBody = new
        {
            model = _model,
            max_tokens = _maxTokens,
            messages = new[] { new { role = "user", content = TranslationReviewPrompt.Build(original, translated, languageName, localeCode) } }
        };

        var msgPath = _baseUrl.EndsWith("/v1", StringComparison.OrdinalIgnoreCase)
            ? $"{_baseUrl}/messages"
            : $"{_baseUrl}/v1/messages";

        var request = new HttpRequestMessage(HttpMethod.Post, msgPath)
        {
            Content = JsonContent.Create(requestBody)
        };
        request.Headers.Add("x-api-key", _apiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");
        foreach (var (k, v) in _extraHeaders)
            if (k != "anthropic-version") request.Headers.TryAddWithoutValidation(k, v);

        var response = await _http.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<AnthropicResponse>();
        return result?.Content?.FirstOrDefault(c => c.Type == "text")?.Text?.Trim() ?? translated;
    }

    private sealed class AnthropicResponse
    {
        [JsonPropertyName("content")] public List<Block>? Content { get; set; }
        internal sealed class Block { [JsonPropertyName("type")] public string Type { get; set; } = ""; [JsonPropertyName("text")] public string Text { get; set; } = ""; }
    }
}

// ── OpenAI-compatible provider (OpenRouter, NVIDIA NIM, OpenAI, Azure OpenAI…) ─

internal sealed class OpenAiCompatibleProvider : ILlmProvider
{
    private readonly HttpClient _http;
    private readonly string _baseUrl;
    private readonly string _apiKey;
    private readonly string _model;
    private readonly Dictionary<string, string> _extraHeaders;
    private readonly int _maxTokens;
    private readonly ILogger _logger;

    public bool IsEnabled => !string.IsNullOrEmpty(_apiKey);

    public OpenAiCompatibleProvider(HttpClient http, LlmProviderEntity provider, LlmModelEntry model, ILogger logger)
    {
        _http = http;
        _baseUrl = provider.BaseUrl.TrimEnd('/');
        _apiKey = provider.ApiKey;
        _model = model.Id;
        _maxTokens = model.MaxTokens;
        _extraHeaders = provider.Headers;
        _logger = logger;
    }

    public async Task<string> ReviewTranslationAsync(string original, string translated, string languageName, string localeCode)
    {
        var requestBody = new
        {
            model = _model,
            max_completion_tokens = _maxTokens,
            messages = new[]
            {
                new { role = "system", content = "You are a professional translation reviewer. Return only the corrected translation text, nothing else." },
                new { role = "user", content = TranslationReviewPrompt.Build(original, translated, languageName, localeCode) }
            }
        };

        var chatPath = _baseUrl.EndsWith("/v1", StringComparison.OrdinalIgnoreCase)
            ? $"{_baseUrl}/chat/completions"
            : $"{_baseUrl}/v1/chat/completions";

        var request = new HttpRequestMessage(HttpMethod.Post, chatPath)
        {
            Content = JsonContent.Create(requestBody)
        };
        request.Headers.Add("Authorization", $"Bearer {_apiKey}");
        foreach (var (k, v) in _extraHeaders)
            request.Headers.TryAddWithoutValidation(k, v);

        var response = await _http.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<OpenAiResponse>();
        return result?.Choices?.FirstOrDefault()?.Message?.Content?.Trim() ?? translated;
    }

    private sealed class OpenAiResponse
    {
        [JsonPropertyName("choices")] public List<Choice>? Choices { get; set; }
        internal sealed class Choice { [JsonPropertyName("message")] public Msg? Message { get; set; } }
        internal sealed class Msg { [JsonPropertyName("content")] public string? Content { get; set; } }
    }
}
