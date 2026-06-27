using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Api.DTOs;
using Api.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Api.Services.Implementations;

/// <summary>
/// Reviews machine translations using a per-request LLM provider config supplied by the edge.
/// Supports "anthropic-messages" and "openai-completions" API types.
/// When config is null, review is skipped and the original translation is returned unchanged.
/// </summary>
public class LlmReviewService : ILlmReviewService
{
    private readonly HttpClient _http;
    private readonly ILogger<LlmReviewService> _logger;
    private readonly SemaphoreSlim _semaphore = new(6, 6);

    public LlmReviewService(HttpClient http, ILogger<LlmReviewService> logger)
    {
        _http = http;
        _logger = logger;
    }

    /// <summary>
    /// Reviews a single machine-translated text for a given locale.
    /// Returns the original if config is null, provider cannot be built, or review fails.
    /// </summary>
    public async Task<string> ReviewAsync(string original, string translated, string localeCode, LlmReviewConfig? config = null)
    {
        if (config == null || string.IsNullOrWhiteSpace(translated))
            return translated;

        var provider = BuildProvider(config);
        if (provider == null || !provider.IsEnabled)
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
    /// Concurrency is bounded by the semaphore (6 concurrent).
    /// </summary>
    public async Task<Dictionary<string, string>> ReviewManyAsync(string original, Dictionary<string, string> translations, LlmReviewConfig? config = null)
    {
        if (config == null)
            return translations;

        var provider = BuildProvider(config);
        if (provider == null || !provider.IsEnabled)
            return translations;

        var tasks = translations.Select(async kvp =>
        {
            var reviewed = await ReviewAsync(original, kvp.Value, kvp.Key, config);
            return (kvp.Key, reviewed);
        });

        var results = await Task.WhenAll(tasks);
        return results.ToDictionary(r => r.Key, r => r.reviewed);
    }

    // ── Provider factory ──────────────────────────────────────────────────────

    private ILlmProvider? BuildProvider(LlmReviewConfig config)
    {
        if (string.IsNullOrWhiteSpace(config.ApiKey) || string.IsNullOrWhiteSpace(config.BaseUrl))
            return null;

        return config.Api == "anthropic-messages"
            ? new AnthropicProvider(_http, config, _logger)
            : new OpenAiCompatibleProvider(_http, config, _logger);
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
    private readonly int _maxTokens;
    private readonly Dictionary<string, string>? _extraHeaders;
    private readonly ILogger _logger;

    public bool IsEnabled => !string.IsNullOrEmpty(_apiKey);

    public AnthropicProvider(HttpClient http, Api.DTOs.LlmReviewConfig config, ILogger logger)
    {
        _http = http;
        _baseUrl = config.BaseUrl.TrimEnd('/');
        _apiKey = config.ApiKey;
        _model = config.Model;
        _maxTokens = 4096;
        _extraHeaders = config.Headers;
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
        if (_extraHeaders != null)
            foreach (var (k, v) in _extraHeaders)
                request.Headers.TryAddWithoutValidation(k, v);

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
    private readonly int _maxTokens;
    private readonly Dictionary<string, string>? _extraHeaders;
    private readonly ILogger _logger;

    public bool IsEnabled => !string.IsNullOrEmpty(_apiKey);

    public OpenAiCompatibleProvider(HttpClient http, Api.DTOs.LlmReviewConfig config, ILogger logger)
    {
        _http = http;
        _baseUrl = config.BaseUrl.TrimEnd('/');
        _apiKey = config.ApiKey;
        _model = config.Model;
        _maxTokens = 4096;
        _extraHeaders = config.Headers;
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
        if (_extraHeaders != null)
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
