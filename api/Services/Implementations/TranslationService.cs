using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Api.DTOs.Auth;
using Api.DTOs.Blog;
using Api.Entities;
using Api.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Api.Services.Implementations;

public class TranslationService : ITranslationService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<TranslationService> _logger;
    private readonly string _subscriptionKey;
    private readonly string _endpoint;
    private readonly string _region;

    private const int MaxBatchElements = 100;
    private const int MaxBatchChars = 45000;
    private const int MaxRetries = 3;
    private const int MaxTargetLanguagesPerRequest = 10;

    public TranslationService(HttpClient httpClient, ILogger<TranslationService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _subscriptionKey = Environment.GetEnvironmentVariable("AZURE_TRANSLATION_KEY") ?? string.Empty;
        _endpoint = Environment.GetEnvironmentVariable("AZURE_TRANSLATION_ENDPOINT") ?? "https://api.cognitive.microsofttranslator.com";
        _region = Environment.GetEnvironmentVariable("AZURE_TRANSLATION_REGION") ?? "northeurope";
    }

    public async Task<List<string>> TranslateTextsAsync(List<string> texts, string targetLang, string sourceLang = "en")
    {
        if (texts.Count == 0) return [];

        var results = new List<string>(texts.Count);
        var batches = CreateBatches(texts);

        foreach (var batch in batches)
        {
            var batchResults = await TranslateBatchAsync(batch, targetLang, sourceLang);
            results.AddRange(batchResults);
        }

        return results;
    }

    /// <summary>
    /// Translates a single text to many target languages in parallel batches of 10.
    /// Returns a dictionary of BCP-47 locale code → translated text.
    /// The translatorCode map is used to convert BCP-47 codes to Azure Translator codes.
    /// </summary>
    public async Task<Dictionary<string, string>> TranslateToManyAsync(
        string text,
        IEnumerable<(string localeCode, string translatorCode)> targets,
        string sourceLang = "en")
    {
        var result = new Dictionary<string, string>();
        // Azure Translator allows up to 10 target languages per request
        var batches = targets.Chunk(10);

        foreach (var batch in batches)
        {
            var toParams = string.Join("&", batch.Select(t => $"to={Uri.EscapeDataString(t.translatorCode)}"));
            var url = $"{_endpoint}/translate?api-version=3.0&from={sourceLang}&{toParams}";

            var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(new[] { new TranslationRequestItem { Text = text } }),
            };
            request.Headers.Add("Ocp-Apim-Subscription-Key", _subscriptionKey);
            request.Headers.Add("Ocp-Apim-Subscription-Region", _region);

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var responseItems = await response.Content.ReadFromJsonAsync<List<TranslationResponseItem>>();
            if (responseItems == null || responseItems.Count == 0) continue;

            // Build a translatorCode → localeCode reverse map for this batch
            var codeMap = batch.ToDictionary(t => t.translatorCode, t => t.localeCode);

            foreach (var translation in responseItems[0].Translations)
            {
                if (codeMap.TryGetValue(translation.To, out var localeCode))
                    result[localeCode] = translation.Text;
            }
        }

        return result;
    }

    public async Task<BlogPostTranslation> TranslateBlogPostAsync(BlogPostEntity post, string targetLang)
    {
        var metaTexts = new List<string> { post.Title, post.Excerpt };
        var translatedMeta = await TranslateTextsAsync(metaTexts, targetLang);

        var contentHtml = string.Join("\n", post.Content);
        var translatedContent = await TranslateTextsAsync([contentHtml], targetLang);

        return new BlogPostTranslation
        {
            Title = translatedMeta[0],
            Excerpt = translatedMeta[1],
            Content = [translatedContent[0]],
            IsAutoTranslated = true,
            TranslatedAt = DateTime.UtcNow,
        };
    }

    /// <summary>
    /// Translates a blog post to multiple target languages using multi-target batching.
    /// Azure Translator supports up to 10 target languages per request — this method
    /// exploits that to minimize API calls while staying within rate limits.
    /// </summary>
    public async Task<Dictionary<string, BlogPostTranslation>> TranslateBlogPostBatchAsync(
        BlogPostEntity post, List<string> targetLangs)
    {
        var results = new Dictionary<string, BlogPostTranslation>();
        if (targetLangs.Count == 0) return results;

        // Build all texts to translate: [title, excerpt, contentHtml]
        var contentHtml = string.Join("\n", post.Content);
        var allTexts = new List<string> { post.Title, post.Excerpt, contentHtml };

        // Adaptive: Azure limit is 50K chars total (source × target langs).
        // Scale down target langs per request based on content size.
        var totalChars = allTexts.Sum(t => t.Length);
        var maxLangs = Math.Max(2, Math.Min(MaxTargetLanguagesPerRequest, 45000 / Math.Max(1, totalChars)));
        _logger.LogInformation("Blog batch translate: {Chars} chars, {MaxLangs} langs/request", totalChars, maxLangs);

        var langChunks = targetLangs.Chunk(maxLangs).ToList();

        foreach (var chunk in langChunks)
        {
            try
            {
                var toParams = string.Join("&", chunk.Select(l => $"to={Uri.EscapeDataString(l)}"));
                var url = $"{_endpoint}/translate?api-version=3.0&from=en&{toParams}&textType=html";

                var body = allTexts.Select(t => new TranslationRequestItem { Text = t }).ToList();

                var responseItems = await SendWithRetryAsync<List<TranslationResponseItem>>(url, body);
                if (responseItems == null || responseItems.Count < 3) continue;

                foreach (var lang in chunk)
                {
                    var titleTranslation = responseItems[0].Translations.FirstOrDefault(t => t.To == lang)?.Text ?? post.Title;
                    var excerptTranslation = responseItems[1].Translations.FirstOrDefault(t => t.To == lang)?.Text ?? post.Excerpt;
                    var contentTranslation = responseItems[2].Translations.FirstOrDefault(t => t.To == lang)?.Text ?? contentHtml;

                    results[lang] = new BlogPostTranslation
                    {
                        Title = titleTranslation,
                        Excerpt = excerptTranslation,
                        Content = [contentTranslation],
                        IsAutoTranslated = true,
                        TranslatedAt = DateTime.UtcNow,
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Blog batch translate failed for chunk [{Langs}], skipping", string.Join(",", chunk));
            }
        }

        return results;
    }

    public async Task<PageTranslation> TranslateUserPageAsync(UserEntity user, string targetLang)
    {
        var texts = new List<string>();
        texts.Add(user.Bio ?? "");
        texts.Add(user.PageContent ?? "");

        var translated = await TranslateTextsAsync(texts, targetLang);

        return new PageTranslation
        {
            Bio = translated[0],
            PageContent = translated[1],
            IsAutoTranslated = true,
            TranslatedAt = DateTime.UtcNow,
        };
    }

    private List<List<TranslationRequestItem>> CreateBatches(List<string> texts)
    {
        var batches = new List<List<TranslationRequestItem>>();
        var currentBatch = new List<TranslationRequestItem>();
        var currentChars = 0;

        foreach (var text in texts)
        {
            if (currentBatch.Count >= MaxBatchElements || currentChars + text.Length > MaxBatchChars)
            {
                if (currentBatch.Count > 0)
                {
                    batches.Add(currentBatch);
                    currentBatch = [];
                    currentChars = 0;
                }
            }

            currentBatch.Add(new TranslationRequestItem { Text = text });
            currentChars += text.Length;
        }

        if (currentBatch.Count > 0)
            batches.Add(currentBatch);

        return batches;
    }

    private async Task<List<string>> TranslateBatchAsync(List<TranslationRequestItem> batch, string targetLang, string sourceLang)
    {
        var url = $"{_endpoint}/translate?api-version=3.0&from={sourceLang}&to={targetLang}&textType=html";

        var results = await SendWithRetryAsync<List<TranslationResponseItem>>(url, batch);

        if (results == null)
        {
            _logger.LogError("Translation API returned null response");
            return batch.Select(b => b.Text).ToList();
        }

        return results.Select(r => r.Translations.FirstOrDefault()?.Text ?? string.Empty).ToList();
    }

    /// <summary>
    /// Sends a translation request with exponential backoff on 429 (rate limit) responses.
    /// </summary>
    private async Task<T?> SendWithRetryAsync<T>(string url, object body) where T : class
    {
        for (var attempt = 0; attempt <= MaxRetries; attempt++)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(body),
            };
            request.Headers.Add("Ocp-Apim-Subscription-Key", _subscriptionKey);
            request.Headers.Add("Ocp-Apim-Subscription-Region", _region);

            var response = await _httpClient.SendAsync(request);

            if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            {
                if (attempt == MaxRetries) throw new HttpRequestException("Azure Translator rate limit exceeded after retries");

                // Use Retry-After header if present, otherwise exponential backoff
                var retryAfter = response.Headers.RetryAfter?.Delta
                    ?? TimeSpan.FromSeconds(Math.Pow(2, attempt + 1));
                _logger.LogWarning("Azure Translator 429 — retrying in {Seconds}s (attempt {Attempt}/{Max})",
                    retryAfter.TotalSeconds, attempt + 1, MaxRetries);
                await Task.Delay(retryAfter);
                continue;
            }

            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<T>();
        }

        return null;
    }

    // Request/response models for Azure Translator API

    private class TranslationRequestItem
    {
        [JsonPropertyName("text")]
        public string Text { get; set; } = string.Empty;
    }

    private class TranslationResponseItem
    {
        [JsonPropertyName("translations")]
        public List<TranslationResult> Translations { get; set; } = [];
    }

    private class TranslationResult
    {
        [JsonPropertyName("text")]
        public string Text { get; set; } = string.Empty;

        [JsonPropertyName("to")]
        public string To { get; set; } = string.Empty;
    }
}
