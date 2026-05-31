using System.Net;
using Api.DTOs.Blog;
using Api.Exceptions;
using Api.Helpers;
using Api.Services.Interfaces;
using FluentValidation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace Api.Functions;

// NOTE: All blog CRUD, reads, stats, and translation persistence now live in the
// Cloudflare Worker (D1). Only AI translation compute remains here — the Worker
// proxies the translate trigger to Azure, then persists the returned translations
// to D1 itself (see src/server/db/admin-routes.ts → blog translate + translations).
public class BlogFunctions
{
    private readonly IBlogService _blogService;
    private readonly ITranslationService _translationService;
    private readonly AuthHelper _auth;
    private readonly ILogger<BlogFunctions> _logger;
    private readonly IValidator<TranslateBlogPostRequest> _translateValidator;

    public BlogFunctions(
        IBlogService blogService,
        ITranslationService translationService,
        AuthHelper auth,
        ILogger<BlogFunctions> logger,
        IValidator<TranslateBlogPostRequest> translateValidator)
    {
        _blogService = blogService;
        _translationService = translationService;
        _auth = auth;
        _logger = logger;
        _translateValidator = translateValidator;
    }

    [Function("AdminTranslateBlogPost")]
    public async Task<HttpResponseData> AdminTranslate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/blog/{slug}/translate")] HttpRequestData req,
        string slug)
    {
        await _auth.RequirePermissionAsync(req, "manage:blog");
        var request = await FunctionHelper.DeserializeAndValidateAsync<TranslateBlogPostRequest>(req, _translateValidator);

        var targets = request.Targets.Select(t => (t.LocaleCode, t.TranslatorCode)).ToList();
        _logger.LogInformation("[{Slug}] Translate: sourceLocale={SourceLocale} hasTitle={HasTitle}", slug, request.SourceLocale, request.Title != null);

        // Build post from D1-supplied content so Cosmos DB is not read
        Api.Entities.BlogPostEntity? postData = null;
        if (request.Title != null)
        {
            postData = new Api.Entities.BlogPostEntity
            {
                Slug = slug,
                Lang = request.SourceLocale,
                Title = request.Title,
                Excerpt = request.Excerpt,
                Content = request.Content?.Cast<object>().ToList(),
            };
        }

        var translations = await _blogService.TranslateAsync(slug, targets, _translationService, request.SourceLocale, postData)
            ?? throw new NotFoundException("Post not found.");

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK,
            new { message = $"Translated '{slug}' to {targets.Count} language(s).", count = targets.Count });
    }
}
