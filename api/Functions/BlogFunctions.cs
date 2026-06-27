using System.Net;
using Api.DTOs.Blog;
using Api.Exceptions;
using Api.Helpers;
using Api.Services.Interfaces;
using FluentValidation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Api.Functions;

// NOTE: All blog CRUD, reads, stats, and translation persistence now live in the
// Cloudflare Worker (D1). Only AI translation compute remains here — the Worker
// proxies the translate trigger to Azure, then persists the returned translations
// to D1 itself (see src/server/db/admin-routes.ts → blog translate + translations).
// No user auth on Azure: the Worker authenticates the admin and forwards a shared
// secret (InternalAuth).
public class BlogFunctions
{
    private readonly IBlogService _blogService;
    private readonly ITranslationService _translationService;
    private readonly IConfiguration _config;
    private readonly ILogger<BlogFunctions> _logger;
    private readonly IValidator<TranslateBlogPostRequest> _translateValidator;

    public BlogFunctions(
        IBlogService blogService,
        ITranslationService translationService,
        IConfiguration config,
        ILogger<BlogFunctions> logger,
        IValidator<TranslateBlogPostRequest> translateValidator)
    {
        _blogService = blogService;
        _translationService = translationService;
        _config = config;
        _logger = logger;
        _translateValidator = translateValidator;
    }

    [Function("AdminTranslateBlogPost")]
    public async Task<HttpResponseData> AdminTranslate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/blog/{slug}/translate")] HttpRequestData req,
        string slug)
    {
        InternalAuth.Verify(req, _config);
        var request = await FunctionHelper.DeserializeAndValidateAsync<TranslateBlogPostRequest>(req, _translateValidator);

        var targets = request.Targets.Select(t => (t.LocaleCode, t.TranslatorCode)).ToList();
        _logger.LogInformation("[{Slug}] Translate: sourceLocale={SourceLocale}", slug, request.SourceLocale);

        // Post content always supplied by the edge from D1 (source of truth).
        var postData = new Api.Entities.BlogPostEntity
        {
            Slug = slug,
            Lang = request.SourceLocale,
            Title = request.Title,
            Excerpt = request.Excerpt,
            Content = request.Content?.Cast<object>().ToList(),
        };

        var translations = await _blogService.TranslateAsync(slug, targets, _translationService, request.SourceLocale, postData, request.LlmReview)
            ?? throw new NotFoundException("Post not found.");

        // Return the per-locale translations so the edge can persist them to D1.
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new
        {
            message = $"Translated '{slug}' to {targets.Count} language(s).",
            count = targets.Count,
            translations = translations.ToDictionary(
                kv => kv.Key,
                kv => new { title = kv.Value.Title, excerpt = kv.Value.Excerpt, content = kv.Value.Content }),
        });
    }
}
