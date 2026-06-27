using Api.Entities;
using Api.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Api.Services.Implementations;

public class BlogService : IBlogService
{
    private readonly ILlmReviewService _llmReview;
    private readonly ILogger<BlogService> _logger;

    public BlogService(ILlmReviewService llmReview, ILogger<BlogService> logger)
    {
        _llmReview = llmReview;
        _logger = logger;
    }

    // Translation — stateless. The edge always supplies the post content (postData)
    // from D1 (source of truth); Cosmos DB is never read or written here.
    public async Task<Dictionary<string, BlogPostTranslationEntity>?> TranslateAsync(
        string slug, List<(string localeCode, string translatorCode)> targets, ITranslationService translationService,
        string sourceLocale, BlogPostEntity postData, Api.DTOs.LlmReviewConfig? llmReview = null)
    {
        var post = postData;

        var effectiveSourceLocale = !string.IsNullOrWhiteSpace(sourceLocale) ? sourceLocale : "en-US";
        var sourceTranslatorCode = ToAzureSourceCode(effectiveSourceLocale);

        // Build reverse map: translatorCode → localeCode for result storage
        var codeMap = targets.ToDictionary(t => t.translatorCode, t => t.localeCode);
        var translatorCodes = targets.Select(t => t.translatorCode).ToList();

        // ── Phase 1: Batch translate via Azure Translator (10 langs per request) ──
        _logger.LogInformation("[{Slug}] Phase 1: Azure Translator — {Count} languages from {Source}", slug, translatorCodes.Count, sourceTranslatorCode);
        var machineTranslations = await translationService.TranslateBlogPostBatchAsync(post, translatorCodes, sourceTranslatorCode);
        _logger.LogInformation("[{Slug}] Phase 1 complete — {Count} translations received", slug, machineTranslations.Count);

        // ── Phase 2: LLM review in parallel (bounded by semaphore in LlmReviewService) ──
        _logger.LogInformation("[{Slug}] Phase 2: LLM review — {Count} languages", slug, machineTranslations.Count);
        var completed = 0;
        var total = machineTranslations.Count;

        // Process languages in parallel batches of 10 to balance throughput and save frequency
        var langBatches = machineTranslations.Keys.Chunk(10).ToList();

        // Get content as strings for LLM review
        var contentStrings = post.Content?.Select(c => c?.ToString() ?? "").ToList() ?? [];

        var allResults = new Dictionary<string, BlogPostTranslationEntity>();

        foreach (var batch in langBatches)
        {
            var tasks = batch.Select(async lang =>
            {
                try
                {
                    var dtoBatch = machineTranslations[lang];

                    // Review title, excerpt, and content blocks in parallel
                    var titleTask = _llmReview.ReviewAsync(post.Title, dtoBatch.Title, lang, llmReview);
                    var excerptTask = _llmReview.ReviewAsync(post.Excerpt, dtoBatch.Excerpt, lang, llmReview);
                    var contentTasks = dtoBatch.Content.Select((block, idx) =>
                    {
                        var originalBlock = idx < contentStrings.Count ? contentStrings[idx] : "";
                        return _llmReview.ReviewAsync(originalBlock, block, lang, llmReview);
                    }).ToList();

                    await Task.WhenAll(titleTask, excerptTask, Task.WhenAll(contentTasks));

                    dtoBatch.Title = titleTask.Result;
                    dtoBatch.Excerpt = excerptTask.Result;
                    dtoBatch.Content = contentTasks.Select(t => t.Result).ToList();

                    var count = Interlocked.Increment(ref completed);
                    _logger.LogInformation("[{Slug}] [{Lang}] LLM review done ({Count}/{Total})", slug, lang, count, total);
                    return (lang, dtoBatch, success: true);
                }
                catch (Exception ex)
                {
                    Interlocked.Increment(ref completed);
                    _logger.LogError(ex, "[{Slug}] [{Lang}] LLM review failed — keeping machine translation", slug, lang);
                    return (lang, machineTranslations[lang], success: true);
                }
            });

            var results = await Task.WhenAll(tasks);

            // Collect batch — store by localeCode (e.g. "bs-BA"), not translatorCode ("bs")
            foreach (var (translatorCode, dtoTranslation, _) in results)
            {
                var localeCode = codeMap.TryGetValue(translatorCode, out var lc) ? lc : translatorCode;
                var entity = new BlogPostTranslationEntity
                {
                    PostSlug = slug,
                    Lang = localeCode,
                    Title = dtoTranslation.Title,
                    Excerpt = dtoTranslation.Excerpt,
                    Content = dtoTranslation.Content.Cast<object>().ToList(),
                    IsAutoTranslated = dtoTranslation.IsAutoTranslated,
                    TranslatedAt = dtoTranslation.TranslatedAt,
                };
                allResults[localeCode] = entity;
            }

            _logger.LogInformation("[{Slug}] Collected batch of {Count} translations ({Completed}/{Total})",
                slug, results.Length, completed, total);
        }

        _logger.LogInformation("[{Slug}] Translation complete — {Count} languages", slug, targets.Count);
        return allResults;
    }

    // Azure Translator source codes: most are the 2-letter base, but a few use the full tag
    private static string ToAzureSourceCode(string locale) => locale switch
    {
        "zh-Hans" or "zh-CN" => "zh-Hans",
        "zh-Hant" or "zh-TW" => "zh-Hant",
        "sr-Latn" => "sr-Latn",
        _ => locale.Split('-')[0].ToLowerInvariant(),
    };
}
