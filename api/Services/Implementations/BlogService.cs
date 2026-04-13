using System.Text.RegularExpressions;
using AutoMapper;
using Api.DTOs;
using Api.DTOs.Blog;
using Api.Entities;
using Api.Exceptions;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

namespace Api.Services.Implementations;

public partial class BlogService : IBlogService
{
    private readonly IBlogPostRepository _blogRepo;
    private readonly IBlogPostTranslationRepository _translationRepo;
    private readonly IUserRepository _userRepo;
    private readonly ILlmReviewService _llmReview;
    private readonly IMapper _mapper;
    private readonly ILogger<BlogService> _logger;

    public BlogService(IBlogPostRepository blogRepo, IBlogPostTranslationRepository translationRepo, IUserRepository userRepo, ILlmReviewService llmReview, IMapper mapper, ILogger<BlogService> logger)
    {
        _blogRepo = blogRepo;
        _translationRepo = translationRepo;
        _userRepo = userRepo;
        _llmReview = llmReview;
        _mapper = mapper;
        _logger = logger;
    }

    // Public endpoints

    public async Task<List<BlogPostResponse>> GetPublishedAsync(string? lang = null)
    {
        var posts = await _blogRepo.GetPublishedAsync();

        // Batch lookup authors to avoid N+1
        var authorIds = posts.Where(p => p.AuthorId != null).Select(p => p.AuthorId!).Distinct().ToList();
        var authors = authorIds.Count > 0
            ? (await _userRepo.GetByIdsAsync(authorIds)).ToDictionary(u => u.Id)
            : new Dictionary<string, UserEntity>();

        var tasks = posts.Select(async p =>
        {
            BlogPostTranslationEntity? translation = null;
            if (lang != null)
                translation = await _translationRepo.GetAsync(p.Slug, lang);
            authors.TryGetValue(p.AuthorId ?? "", out var author);
            return MapToPublicResponse(p, translation, author);
        });
        return (await Task.WhenAll(tasks)).ToList();
    }

    public async Task<PaginatedResponse<BlogPostResponse>> GetPublishedPagedAsync(
        int page, int pageSize, string? lang = null, string? category = null,
        string? subcategory = null, string? tag = null, string? search = null)
    {
        var (posts, totalCount) = await _blogRepo.GetPublishedPagedAsync(
            page, pageSize, category, subcategory, tag, search);

        // Batch lookup authors
        var authorIds = posts.Where(p => p.AuthorId != null).Select(p => p.AuthorId!).Distinct().ToList();
        var authors = authorIds.Count > 0
            ? (await _userRepo.GetByIdsAsync(authorIds)).ToDictionary(u => u.Id)
            : new Dictionary<string, UserEntity>();

        var itemTasks = posts.Select(async p =>
        {
            BlogPostTranslationEntity? translation = null;
            if (lang != null)
                translation = await _translationRepo.GetAsync(p.Slug, lang);
            authors.TryGetValue(p.AuthorId ?? "", out var author);
            return MapToPublicResponse(p, translation, author);
        });
        var items = (await Task.WhenAll(itemTasks)).ToList();

        return new PaginatedResponse<BlogPostResponse>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = (int)totalCount,
            TotalPages = (int)Math.Ceiling((double)totalCount / pageSize),
        };
    }

    public async Task<BlogPostResponse?> GetBySlugAsync(string slug, string? lang = null)
    {
        var post = await _blogRepo.GetBySlugAsync(slug, publishedOnly: true);

        if (post == null) return null;

        BlogPostTranslationEntity? translation = null;
        if (lang != null)
            translation = await _translationRepo.GetAsync(post.Slug, lang);

        UserEntity? author = null;
        if (post.AuthorId != null)
            author = await _userRepo.GetByIdAsync(post.AuthorId);

        return MapToPublicResponse(post, translation, author);
    }

    public async Task<List<string>> GetCategoriesAsync()
    {
        var posts = await _blogRepo.GetPublishedAsync();
        return posts
            .Select(p => p.Category)
            .Where(c => !string.IsNullOrEmpty(c))
            .Distinct()
            .ToList()!;
    }

    // Admin endpoints

    public async Task<List<AdminBlogPostResponse>> GetAllAsync(string? filterAuthorId = null)
    {
        var posts = await _blogRepo.GetAllAsync(filterAuthorId);

        // Batch lookup authors
        var authorIds = posts.Where(p => p.AuthorId != null).Select(p => p.AuthorId!).Distinct().ToList();
        var authors = authorIds.Count > 0
            ? (await _userRepo.GetByIdsAsync(authorIds)).ToDictionary(u => u.Id)
            : new Dictionary<string, UserEntity>();

        return posts.Select(p =>
        {
            authors.TryGetValue(p.AuthorId ?? "", out var author);
            return MapToAdminResponse(p, author);
        }).ToList();
    }

    public async Task<BlogPostEntity?> GetDocumentBySlugAsync(string slug)
    {
        return await _blogRepo.GetBySlugAsync(slug);
    }

    public async Task<AdminBlogPostResponse> CreateAsync(CreateBlogPostRequest request, string? authorId, string? authorName)
    {
        var slug = string.IsNullOrWhiteSpace(request.Slug)
            ? GenerateSlug(request.Title)
            : request.Slug;

        DateTime? publishedAt = null;
        if (!string.IsNullOrWhiteSpace(request.PublishedAt) && DateTime.TryParse(request.PublishedAt, out var parsedDate))
            publishedAt = parsedDate;
        else if (!string.IsNullOrWhiteSpace(request.PublishedAt))
            publishedAt = DateTime.UtcNow;

        int? readTime = null;
        if (!string.IsNullOrWhiteSpace(request.ReadTime) && int.TryParse(request.ReadTime, out var parsedReadTime))
            readTime = parsedReadTime;

        var doc = new BlogPostEntity
        {
            Slug = slug,
            Title = request.Title,
            Excerpt = request.Excerpt,
            PublishedAt = publishedAt ?? DateTime.UtcNow,
            Author = authorName ?? "Unknown",
            ReadTime = readTime,
            Category = request.Category,
            Subcategory = request.Subcategory,
            Tags = request.Tags,
            Content = request.Content.Cast<object>().ToList(),
            IsPublished = request.IsPublished,
            IsFeatured = request.IsFeatured,
            CoverImage = request.CoverImage,
            BannerImage = request.BannerImage,
            AuthorId = authorId,
        };

        try
        {
            await _blogRepo.InsertAsync(doc);
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Conflict)
        {
            throw new ConflictException("A post with this slug already exists.");
        }

        if (doc.IsFeatured)
        {
            await UnfeatureOthersInCategoryAsync(doc.Category, doc.Id);
        }

        _logger.LogInformation("Blog post created: {Slug}", slug);

        UserEntity? author = null;
        if (doc.AuthorId != null)
            author = await _userRepo.GetByIdAsync(doc.AuthorId);

        return MapToAdminResponse(doc, author);
    }

    public async Task<AdminBlogPostResponse?> UpdateAsync(string slug, UpdateBlogPostRequest request)
    {
        var existing = await _blogRepo.GetBySlugAsync(slug);
        if (existing == null) return null;

        if (request.Slug != null) existing.Slug = request.Slug;
        if (request.Title != null) existing.Title = request.Title;
        if (request.Excerpt != null) existing.Excerpt = request.Excerpt;
        if (request.PublishedAt != null)
        {
            if (DateTime.TryParse(request.PublishedAt, out var parsedDate))
                existing.PublishedAt = parsedDate;
        }
        if (request.Author != null) existing.Author = request.Author;
        if (request.ReadTime != null && int.TryParse(request.ReadTime, out var parsedReadTime))
            existing.ReadTime = parsedReadTime;
        if (request.Category != null) existing.Category = request.Category;
        if (request.Subcategory != null) existing.Subcategory = request.Subcategory;
        if (request.Tags != null) existing.Tags = request.Tags;
        if (request.Content != null) existing.Content = request.Content.Cast<object>().ToList();
        if (request.IsPublished.HasValue) existing.IsPublished = request.IsPublished.Value;
        if (request.IsFeatured.HasValue) existing.IsFeatured = request.IsFeatured.Value;
        if (request.CoverImage != null) existing.CoverImage = request.CoverImage;
        if (request.BannerImage != null) existing.BannerImage = request.BannerImage;

        var updated = await _blogRepo.ReplaceAsync(existing);

        if (updated.IsFeatured)
        {
            await UnfeatureOthersInCategoryAsync(updated.Category, updated.Id);
        }

        UserEntity? author = null;
        if (updated.AuthorId != null)
            author = await _userRepo.GetByIdAsync(updated.AuthorId);

        return MapToAdminResponse(updated, author);
    }

    public async Task<bool> DeleteAsync(string slug)
    {
        return await _blogRepo.DeleteAsync(slug);
    }

    public async Task<int> SeedAsync(List<CreateBlogPostRequest> posts, string? authorName)
    {
        var inserted = 0;

        foreach (var post in posts)
        {
            var slug = string.IsNullOrWhiteSpace(post.Slug)
                ? GenerateSlug(post.Title)
                : post.Slug;

            // Skip if slug already exists
            var existing = await _blogRepo.GetBySlugAsync(slug);
            if (existing != null) continue;

            DateTime? publishedAt = null;
            if (!string.IsNullOrWhiteSpace(post.PublishedAt) && DateTime.TryParse(post.PublishedAt, out var parsedDate))
                publishedAt = parsedDate;

            int? readTime = null;
            if (!string.IsNullOrWhiteSpace(post.ReadTime) && int.TryParse(post.ReadTime, out var parsedReadTime))
                readTime = parsedReadTime;

            var doc = new BlogPostEntity
            {
                Slug = slug,
                Title = post.Title,
                Excerpt = post.Excerpt,
                PublishedAt = publishedAt,
                Author = authorName ?? "Unknown",
                ReadTime = readTime,
                Category = post.Category,
                Subcategory = post.Subcategory,
                Tags = post.Tags,
                Content = post.Content.Cast<object>().ToList(),
                IsPublished = post.IsPublished,
                IsFeatured = post.IsFeatured,
                CoverImage = post.CoverImage,
                BannerImage = post.BannerImage,
            };

            await _blogRepo.InsertAsync(doc);
            inserted++;
        }

        _logger.LogInformation("Seeded {Count} blog posts", inserted);
        return inserted;
    }

    public async Task<Dictionary<string, int>> GetPostCountsByAuthorIdsAsync(IEnumerable<string> authorIds)
    {
        return await _blogRepo.GetPostCountsByAuthorIdsAsync(authorIds);
    }

    public async Task<(long total, long published)> GetStatsAsync()
    {
        var total = await _blogRepo.CountAsync();
        var published = await _blogRepo.CountPublishedAsync();
        return (total, published);
    }

    // Translation methods

    public async Task<Dictionary<string, BlogPostTranslationEntity>?> TranslateAsync(
        string slug, List<string> languages, ITranslationService translationService)
    {
        var post = await _blogRepo.GetBySlugAsync(slug);
        if (post == null) return null;

        // ── Phase 1: Batch translate via Azure Translator (10 langs per request) ──
        _logger.LogInformation("[{Slug}] Phase 1: Azure Translator — {Count} languages", slug, languages.Count);
        var machineTranslations = await translationService.TranslateBlogPostBatchAsync(post, languages);
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
                    var titleTask = _llmReview.ReviewAsync(post.Title, dtoBatch.Title, lang);
                    var excerptTask = _llmReview.ReviewAsync(post.Excerpt, dtoBatch.Excerpt, lang);
                    var contentTasks = dtoBatch.Content.Select((block, idx) =>
                    {
                        var originalBlock = idx < contentStrings.Count ? contentStrings[idx] : "";
                        return _llmReview.ReviewAsync(originalBlock, block, lang);
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

            // Save batch to separate translation container
            foreach (var (lang, dtoTranslation, _) in results)
            {
                var entity = new BlogPostTranslationEntity
                {
                    PostSlug = slug,
                    Lang = lang,
                    Title = dtoTranslation.Title,
                    Excerpt = dtoTranslation.Excerpt,
                    Content = dtoTranslation.Content.Cast<object>().ToList(),
                    IsAutoTranslated = dtoTranslation.IsAutoTranslated,
                    TranslatedAt = dtoTranslation.TranslatedAt,
                };
                await _translationRepo.UpsertAsync(entity);
                allResults[lang] = entity;
            }

            _logger.LogInformation("[{Slug}] Saved batch of {Count} translations ({Completed}/{Total})",
                slug, results.Length, completed, total);
        }

        _logger.LogInformation("[{Slug}] Translation complete — {Count} languages", slug, languages.Count);
        return allResults;
    }

    public async Task<BlogPostTranslationEntity?> UpdateTranslationAsync(
        string slug, string lang, UpdateTranslationRequest request)
    {
        var post = await _blogRepo.GetBySlugAsync(slug);
        if (post == null) return null;

        var existing = await _translationRepo.GetAsync(slug, lang) ?? new BlogPostTranslationEntity
        {
            PostSlug = slug,
            Lang = lang,
        };

        if (request.Title != null) existing.Title = request.Title;
        if (request.Excerpt != null) existing.Excerpt = request.Excerpt;
        if (request.Content != null) existing.Content = request.Content.Cast<object>().ToList();
        existing.IsAutoTranslated = false;
        existing.TranslatedAt = DateTime.UtcNow;

        await _translationRepo.UpsertAsync(existing);

        return existing;
    }

    public async Task<Dictionary<string, BlogPostTranslationEntity>?> GetTranslationsAsync(string slug)
    {
        var post = await _blogRepo.GetBySlugAsync(slug);
        if (post == null) return null;
        return await _translationRepo.GetAllForPostAsDictAsync(slug);
    }

    public async Task<bool?> DeleteTranslationAsync(string slug, string lang)
    {
        var post = await _blogRepo.GetBySlugAsync(slug);
        if (post == null) return null;

        var existing = await _translationRepo.GetAsync(slug, lang);
        if (existing == null) return false;

        await _translationRepo.DeleteAsync(slug, lang);
        return true;
    }

    // Helpers

    private static string GenerateAuthorSlug(UserEntity user)
    {
        return $"{user.FirstName}-{user.LastName}".ToLowerInvariant().Replace(" ", "-");
    }

    private BlogPostResponse MapToPublicResponse(BlogPostEntity doc, BlogPostTranslationEntity? translation = null, UserEntity? author = null)
    {
        var response = _mapper.Map<BlogPostResponse>(doc);
        if (translation != null)
        {
            response.Title = translation.Title ?? response.Title;
            response.Excerpt = translation.Excerpt ?? response.Excerpt;
            if (translation.Content != null)
                response.Content = translation.Content.Select(c => c?.ToString() ?? "").ToList();
        }
        if (author != null)
        {
            response.AuthorSlug = author.Slug ?? GenerateAuthorSlug(author);
            response.AuthorAvatarUrl = author.AvatarUrl;
        }
        return response;
    }

    private AdminBlogPostResponse MapToAdminResponse(BlogPostEntity doc, UserEntity? author = null)
    {
        var response = _mapper.Map<AdminBlogPostResponse>(doc);
        if (author != null)
        {
            response.AuthorSlug = author.Slug ?? GenerateAuthorSlug(author);
            response.AuthorAvatarUrl = author.AvatarUrl;
        }
        return response;
    }

    private async Task UnfeatureOthersInCategoryAsync(string? category, string excludeId)
    {
        if (string.IsNullOrEmpty(category)) return;

        var all = await _blogRepo.GetAllAsync();
        var toUnfeature = all.Where(p => p.Category == category && p.IsFeatured && p.Id != excludeId).ToList();
        foreach (var post in toUnfeature)
        {
            post.IsFeatured = false;
            await _blogRepo.ReplaceAsync(post);
        }
    }

    private static string GenerateSlug(string title)
    {
        var slug = title.ToLowerInvariant();
        slug = SlugInvalidChars().Replace(slug, "");
        slug = SlugWhitespace().Replace(slug, "-");
        slug = SlugMultipleDashes().Replace(slug, "-");
        return slug.Trim('-');
    }

    [GeneratedRegex(@"[^a-z0-9\s-]")]
    private static partial Regex SlugInvalidChars();

    [GeneratedRegex(@"\s+")]
    private static partial Regex SlugWhitespace();

    [GeneratedRegex(@"-+")]
    private static partial Regex SlugMultipleDashes();
}
