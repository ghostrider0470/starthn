using System.Net;
using System.Text.Json;
using Api.DTOs.Blog;
using Api.Exceptions;
using Api.Helpers;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using FluentValidation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace Api.Functions;

public class BlogFunctions
{
    private readonly IBlogService _blogService;
    private readonly ITagService _tagService;
    private readonly ICategoryService _categoryService;
    private readonly IUserService _userService;
    private readonly ITranslationService _translationService;
    private readonly IBlogPostTranslationRepository _blogTranslationRepo;
    private readonly ILlmReviewService _llmReview;
    private readonly AuthHelper _auth;
    private readonly ILogger<BlogFunctions> _logger;
    private readonly IValidator<CreateBlogPostRequest> _createValidator;
    private readonly IValidator<UpdateBlogPostRequest> _updateValidator;
    private readonly IValidator<TranslateBlogPostRequest> _translateValidator;
    private readonly IValidator<UpdateTranslationRequest> _updateTranslationValidator;

    public BlogFunctions(
        IBlogService blogService,
        ITagService tagService,
        ICategoryService categoryService,
        IUserService userService,
        ITranslationService translationService,
        IBlogPostTranslationRepository blogTranslationRepo,
        ILlmReviewService llmReview,
        AuthHelper auth,
        ILogger<BlogFunctions> logger,
        IValidator<CreateBlogPostRequest> createValidator,
        IValidator<UpdateBlogPostRequest> updateValidator,
        IValidator<TranslateBlogPostRequest> translateValidator,
        IValidator<UpdateTranslationRequest> updateTranslationValidator)
    {
        _blogService = blogService;
        _tagService = tagService;
        _categoryService = categoryService;
        _userService = userService;
        _translationService = translationService;
        _blogTranslationRepo = blogTranslationRepo;
        _llmReview = llmReview;
        _auth = auth;
        _logger = logger;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _translateValidator = translateValidator;
        _updateTranslationValidator = updateTranslationValidator;
    }


    // Public endpoints

    [Function("GetPublishedBlogPosts")]
    public async Task<HttpResponseData> GetPublished(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "blog")] HttpRequestData req)
    {
        var lang = req.Query["lang"];

        // If pagination params are present, return paginated response
        var pageParam = req.Query["page"];
        var pageSizeParam = req.Query["pageSize"];

        if (pageParam != null || pageSizeParam != null)
        {
            var page = int.TryParse(pageParam, out var p) ? Math.Max(1, p) : 1;
            var pageSize = int.TryParse(pageSizeParam, out var ps) ? Math.Clamp(ps, 1, 100) : 9;
            var category = req.Query["category"];
            var subcategory = req.Query["subcategory"];
            var tag = req.Query["tag"];
            var search = req.Query["q"];

            var pagedResult = await _blogService.GetPublishedPagedAsync(
                page, pageSize, lang, category, subcategory, tag, search);
            return await req.CreateJsonResponseAsync(HttpStatusCode.OK, pagedResult);
        }

        // Backwards-compatible: return full list
        var posts = await _blogService.GetPublishedAsync(lang);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, posts);
    }

    [Function("GetBlogPostBySlugOrCategories")]
    public async Task<HttpResponseData> GetBySlugOrCategories(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "blog/{slug}")] HttpRequestData req,
        string slug)
    {
        if (string.Equals(slug, "tags", StringComparison.OrdinalIgnoreCase))
        {
            var tags = await _tagService.GetAllAsync();
            return await req.CreateJsonResponseAsync(HttpStatusCode.OK, tags);
        }

        if (string.Equals(slug, "categories", StringComparison.OrdinalIgnoreCase))
        {
            var categories = await _categoryService.GetAllAsync();
            return await req.CreateJsonResponseAsync(HttpStatusCode.OK, categories);
        }

        var lang = req.Query["lang"];
        var post = await _blogService.GetBySlugAsync(slug, lang)
            ?? throw new NotFoundException("Post not found.");

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, post);
    }

    // Admin endpoints

    [Function("AdminGetAllBlogPosts")]
    public async Task<HttpResponseData> AdminGetAll(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "manage/blog")] HttpRequestData req)
    {
        var principal = await _auth.RequireAnyPermissionAsync(req, "manage:blog", "manage:blog:own");
        var hasFullAccess = _auth.HasPermission(principal, "manage:blog");
        var authorId = hasFullAccess ? null : AuthHelper.GetUserId(principal);
        var posts = await _blogService.GetAllAsync(authorId);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, posts);
    }

    [Function("AdminCreateBlogPost")]
    public async Task<HttpResponseData> AdminCreate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/blog")] HttpRequestData req)
    {
        var principal = await _auth.RequireAnyPermissionAsync(req, "manage:blog", "manage:blog:own");
        var request = await FunctionHelper.DeserializeAndValidateAsync<CreateBlogPostRequest>(req, _createValidator);
        var authorId = AuthHelper.GetUserId(principal);

        string? authorName = null;
        var user = await _userService.GetByIdAsync(authorId);
        if (user != null)
            authorName = $"{user.FirstName} {user.LastName}".Trim();

        var result = await _blogService.CreateAsync(request, authorId, authorName);
        return await req.CreateJsonResponseAsync(HttpStatusCode.Created, result);
    }

    [Function("AdminUpdateBlogPost")]
    public async Task<HttpResponseData> AdminUpdate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "manage/blog/{slug}")] HttpRequestData req,
        string slug)
    {
        var principal = await _auth.RequireAnyPermissionAsync(req, "manage:blog", "manage:blog:own");

        if (!_auth.HasPermission(principal, "manage:blog"))
        {
            var post = await _blogService.GetDocumentBySlugAsync(slug)
                ?? throw new NotFoundException("Post not found.");
            if (post.AuthorId != AuthHelper.GetUserId(principal))
                throw new ForbiddenException("You can only edit your own posts.");
        }

        var request = await FunctionHelper.DeserializeAndValidateAsync<UpdateBlogPostRequest>(req, _updateValidator);
        var result = await _blogService.UpdateAsync(slug, request)
            ?? throw new NotFoundException("Post not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, result);
    }

    [Function("AdminDeleteBlogPost")]
    public async Task<HttpResponseData> AdminDelete(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "manage/blog/{slug}")] HttpRequestData req,
        string slug)
    {
        var principal = await _auth.RequireAnyPermissionAsync(req, "manage:blog", "manage:blog:own");

        if (!_auth.HasPermission(principal, "manage:blog"))
        {
            var post = await _blogService.GetDocumentBySlugAsync(slug)
                ?? throw new NotFoundException("Post not found.");
            if (post.AuthorId != AuthHelper.GetUserId(principal))
                throw new ForbiddenException("You can only delete your own posts.");
        }

        if (!await _blogService.DeleteAsync(slug))
            throw new NotFoundException("Post not found.");

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { message = "Post deleted." });
    }

    [Function("AdminSeedBlogPosts")]
    public async Task<HttpResponseData> AdminSeed(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/blog/seed")] HttpRequestData req)
    {
        var principal = await _auth.RequirePermissionAsync(req, "manage:blog");
        var authorId = AuthHelper.GetUserId(principal);

        string? authorName = null;
        var user = await _userService.GetByIdAsync(authorId);
        if (user != null)
            authorName = $"{user.FirstName} {user.LastName}".Trim();

        var body = await req.ReadAsStringAsync();
        var posts = JsonSerializer.Deserialize<List<CreateBlogPostRequest>>(body!, SharedJsonOptions.Default);
        if (posts == null || posts.Count == 0)
            throw new AppValidationException("body", "Posts array is required.");

        var inserted = await _blogService.SeedAsync(posts, authorName);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { message = $"Seeded {inserted} posts.", inserted });
    }

    [Function("AdminGetStats")]
    public async Task<HttpResponseData> AdminGetStats(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "manage/stats")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "view:admin");

        var totalUsers = await _userService.GetTotalUsersAsync();
        var (totalPosts, publishedPosts) = await _blogService.GetStatsAsync();

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { totalUsers, totalPosts, publishedPosts });
    }

    // Translation endpoints

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

    /// <summary>Returns a list of published posts and which languages they're missing.</summary>
    [Function("AdminGetMissingTranslations")]
    public async Task<HttpResponseData> GetMissingTranslations(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "manage/blog/missing-translations")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "manage:blog");

        var posts = await _blogService.GetAllAsync();
        var publishedPosts = posts.Where(p => p.IsPublished).ToList();

        List<string> seoLocales =
        [
            "bs-BA", "hr-HR", "sr-Latn", "de-DE", "fr-FR", "es-ES", "it-IT", "tr-TR",
            "ar-SA", "pt-BR", "nl-NL", "ru-RU", "ja-JP", "zh-Hans", "ko-KR"
        ];

        var resultTasks = publishedPosts.Select(async p =>
        {
            var existingTranslations = await _blogTranslationRepo.GetAllForPostAsDictAsync(p.Slug);
            var missing = seoLocales.Where(lang => !existingTranslations.ContainsKey(lang)).ToList();
            return new { p.Slug, missing };
        });

        var result = (await Task.WhenAll(resultTasks))
            .Where(p => p.missing.Count > 0)
            .ToList();

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new
        {
            postsWithMissing = result.Count,
            totalMissing = result.Sum(p => p.missing.Count),
            posts = result,
        });
    }

    [Function("AdminGetBlogPostTranslations")]
    public async Task<HttpResponseData> AdminGetTranslations(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "manage/blog/{slug}/translations")] HttpRequestData req,
        string slug)
    {
        await _auth.RequirePermissionAsync(req, "manage:blog");
        var translations = await _blogService.GetTranslationsAsync(slug)
            ?? throw new NotFoundException("Post not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, translations);
    }

    [Function("AdminUpdateBlogPostTranslation")]
    public async Task<HttpResponseData> AdminUpdateTranslation(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "manage/blog/{slug}/translations/{lang}")] HttpRequestData req,
        string slug, string lang)
    {
        await _auth.RequirePermissionAsync(req, "manage:blog");
        var request = await FunctionHelper.DeserializeAndValidateAsync<UpdateTranslationRequest>(req, _updateTranslationValidator);
        var translation = await _blogService.UpdateTranslationAsync(slug, lang, request)
            ?? throw new NotFoundException("Post not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, translation);
    }

    [Function("AdminSyncBlogPostToEdge")]
    public async Task<HttpResponseData> AdminSyncToEdge(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/blog/{slug}/sync")] HttpRequestData req,
        string slug)
    {
        await _auth.RequirePermissionAsync(req, "manage:blog");
        var ok = await _blogService.SyncToEdgeAsync(slug);
        if (!ok) throw new NotFoundException("Post not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { ok = true, slug });
    }

    [Function("AdminSyncAllBlogPostsToEdge")]
    public async Task<HttpResponseData> AdminSyncAllToEdge(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/blog/sync-all")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "manage:blog");
        var synced = await _blogService.SyncAllToEdgeAsync();
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { ok = true, synced });
    }

    [Function("AdminDeleteBlogPostTranslation")]
    public async Task<HttpResponseData> AdminDeleteTranslation(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "manage/blog/{slug}/translations/{lang}")] HttpRequestData req,
        string slug, string lang)
    {
        await _auth.RequirePermissionAsync(req, "manage:blog");
        var result = await _blogService.DeleteTranslationAsync(slug, lang);
        if (result == null)
            throw new NotFoundException("Post not found.");
        if (result == false)
            throw new NotFoundException("Translation not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { message = "Translation deleted." });
    }

    [Function("AdminPurgeBadTranslations")]
    public async Task<HttpResponseData> AdminPurgeBadTranslations(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/blog/purge-bad-translations")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "manage:blog");

        // Translations stored under raw translator codes instead of locale codes
        var badCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "bs", "hr", "de", "fr", "es", "it", "tr", "ar", "pt", "nl", "ru", "ja", "ko"
        };

        var posts = await _blogService.GetAllAsync();
        var deleted = 0;
        var items = new List<object>();

        foreach (var post in posts)
        {
            var translations = await _blogTranslationRepo.GetAllForPostAsync(post.Slug);
            foreach (var t in translations)
            {
                if (!badCodes.Contains(t.Lang)) continue;
                await _blogService.DeleteTranslationAsync(post.Slug, t.Lang);
                deleted++;
                items.Add(new { post.Slug, lang = t.Lang });
            }
        }

        _logger.LogInformation("Purged {Count} bad translations", deleted);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new
        {
            message = $"Purged {deleted} bad translation(s).",
            deleted,
            items,
        });
    }
}
