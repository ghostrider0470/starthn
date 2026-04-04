using System.Text.RegularExpressions;
using AutoMapper;
using Api.DTOs;
using Api.DTOs.Blog;
using Api.Entities;
using Api.Exceptions;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Api.Services.Implementations;

public partial class BlogService : IBlogService
{
    private readonly IBlogPostRepository _blogRepo;
    private readonly IUserRepository _userRepo;
    private readonly ILlmReviewService _llmReview;
    private readonly IMapper _mapper;
    private readonly ILogger<BlogService> _logger;

    public BlogService(IBlogPostRepository blogRepo, IUserRepository userRepo, ILlmReviewService llmReview, IMapper mapper, ILogger<BlogService> logger)
    {
        _blogRepo = blogRepo;
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

        return posts.Select(p =>
        {
            BlogPostTranslation? translation = null;
            if (lang != null && p.Translations.TryGetValue(lang, out var t))
                translation = t;
            authors.TryGetValue(p.AuthorId ?? "", out var author);
            return MapToPublicResponse(p, translation, author);
        }).ToList();
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

        var items = posts.Select(p =>
        {
            BlogPostTranslation? translation = null;
            if (lang != null && p.Translations.TryGetValue(lang, out var t))
                translation = t;
            authors.TryGetValue(p.AuthorId ?? "", out var author);
            return MapToPublicResponse(p, translation, author);
        }).ToList();

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

        BlogPostTranslation? translation = null;
        if (lang != null && post.Translations.TryGetValue(lang, out var t))
            translation = t;

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
            .ToList();
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

        var doc = new BlogPostEntity
        {
            Slug = slug,
            Title = request.Title,
            Excerpt = request.Excerpt,
            PublishedAt = string.IsNullOrWhiteSpace(request.PublishedAt)
                ? DateTime.UtcNow.ToString("yyyy-MM-dd")
                : request.PublishedAt,
            Author = authorName ?? "Unknown",
            ReadTime = request.ReadTime,
            Category = request.Category,
            Subcategory = request.Subcategory,
            Tags = request.Tags,
            Content = request.Content,
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
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
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
        var updates = new List<UpdateDefinition<BlogPostEntity>>();

        if (request.Slug != null) updates.Add(Builders<BlogPostEntity>.Update.Set(p => p.Slug, request.Slug));
        if (request.Title != null) updates.Add(Builders<BlogPostEntity>.Update.Set(p => p.Title, request.Title));
        if (request.Excerpt != null) updates.Add(Builders<BlogPostEntity>.Update.Set(p => p.Excerpt, request.Excerpt));
        if (request.PublishedAt != null) updates.Add(Builders<BlogPostEntity>.Update.Set(p => p.PublishedAt, request.PublishedAt));
        if (request.Author != null) updates.Add(Builders<BlogPostEntity>.Update.Set(p => p.Author, request.Author));
        if (request.ReadTime != null) updates.Add(Builders<BlogPostEntity>.Update.Set(p => p.ReadTime, request.ReadTime));
        if (request.Category != null) updates.Add(Builders<BlogPostEntity>.Update.Set(p => p.Category, request.Category));
        if (request.Subcategory != null) updates.Add(Builders<BlogPostEntity>.Update.Set(p => p.Subcategory, request.Subcategory));
        if (request.Tags != null) updates.Add(Builders<BlogPostEntity>.Update.Set(p => p.Tags, request.Tags));
        if (request.Content != null) updates.Add(Builders<BlogPostEntity>.Update.Set(p => p.Content, request.Content));
        if (request.IsPublished.HasValue) updates.Add(Builders<BlogPostEntity>.Update.Set(p => p.IsPublished, request.IsPublished.Value));
        if (request.IsFeatured.HasValue) updates.Add(Builders<BlogPostEntity>.Update.Set(p => p.IsFeatured, request.IsFeatured.Value));
        if (request.CoverImage != null) updates.Add(Builders<BlogPostEntity>.Update.Set(p => p.CoverImage, request.CoverImage));
        if (request.BannerImage != null) updates.Add(Builders<BlogPostEntity>.Update.Set(p => p.BannerImage, request.BannerImage));

        if (updates.Count == 0) return null;

        updates.Add(Builders<BlogPostEntity>.Update.Set(p => p.UpdatedAt, DateTime.UtcNow));

        var combined = Builders<BlogPostEntity>.Update.Combine(updates);
        var updated = await _blogRepo.FindOneAndUpdateAsync(slug, combined);

        if (updated != null && updated.IsFeatured)
        {
            await UnfeatureOthersInCategoryAsync(updated.Category, updated.Id);
        }

        if (updated == null) return null;

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

            var doc = new BlogPostEntity
            {
                Slug = slug,
                Title = post.Title,
                Excerpt = post.Excerpt,
                PublishedAt = post.PublishedAt,
                Author = authorName ?? "Unknown",
                ReadTime = post.ReadTime,
                Category = post.Category,
                Subcategory = post.Subcategory,
                Tags = post.Tags,
                Content = post.Content,
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

    public async Task<Dictionary<string, BlogPostTranslation>?> TranslateAsync(
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

        foreach (var batch in langBatches)
        {
            var tasks = batch.Select(async lang =>
            {
                try
                {
                    var translation = machineTranslations[lang];

                    // Review title, excerpt, and content blocks in parallel
                    var titleTask = _llmReview.ReviewAsync(post.Title, translation.Title, lang);
                    var excerptTask = _llmReview.ReviewAsync(post.Excerpt, translation.Excerpt, lang);
                    var contentTasks = translation.Content.Select((block, idx) =>
                    {
                        var originalBlock = idx < post.Content.Count ? post.Content[idx] : "";
                        return _llmReview.ReviewAsync(originalBlock, block, lang);
                    }).ToList();

                    await Task.WhenAll(titleTask, excerptTask, Task.WhenAll(contentTasks));

                    translation.Title = titleTask.Result;
                    translation.Excerpt = excerptTask.Result;
                    translation.Content = contentTasks.Select(t => t.Result).ToList();

                    var count = Interlocked.Increment(ref completed);
                    _logger.LogInformation("[{Slug}] [{Lang}] LLM review done ({Count}/{Total})", slug, lang, count, total);
                    return (lang, translation, success: true);
                }
                catch (Exception ex)
                {
                    Interlocked.Increment(ref completed);
                    _logger.LogError(ex, "[{Slug}] [{Lang}] LLM review failed — keeping machine translation", slug, lang);
                    return (lang, machineTranslations[lang], success: true); // keep machine translation on LLM failure
                }
            });

            var results = await Task.WhenAll(tasks);

            // Save batch to MongoDB
            foreach (var (lang, translation, _) in results)
                post.Translations[lang] = translation;

            var incrementalUpdate = Builders<BlogPostEntity>.Update
                .Set(p => p.Translations, post.Translations)
                .Set(p => p.UpdatedAt, DateTime.UtcNow);
            await _blogRepo.FindOneAndUpdateAsync(slug, incrementalUpdate);

            _logger.LogInformation("[{Slug}] Saved batch of {Count} translations ({Completed}/{Total})",
                slug, results.Length, completed, total);
        }

        _logger.LogInformation("[{Slug}] Translation complete — {Count} languages", slug, languages.Count);
        return post.Translations;
    }

    public async Task<BlogPostTranslation?> UpdateTranslationAsync(
        string slug, string lang, UpdateTranslationRequest request)
    {
        var post = await _blogRepo.GetBySlugAsync(slug);
        if (post == null) return null;

        if (!post.Translations.TryGetValue(lang, out var translation))
            translation = new BlogPostTranslation();

        if (request.Title != null) translation.Title = request.Title;
        if (request.Excerpt != null) translation.Excerpt = request.Excerpt;
        if (request.Content != null) translation.Content = request.Content;
        translation.IsAutoTranslated = false;
        translation.TranslatedAt = DateTime.UtcNow;

        post.Translations[lang] = translation;

        var update = Builders<BlogPostEntity>.Update
            .Set(p => p.Translations, post.Translations)
            .Set(p => p.UpdatedAt, DateTime.UtcNow);

        await _blogRepo.FindOneAndUpdateAsync(slug, update);

        return translation;
    }

    public async Task<Dictionary<string, BlogPostTranslation>?> GetTranslationsAsync(string slug)
    {
        var post = await _blogRepo.GetBySlugAsync(slug);
        return post?.Translations;
    }

    public async Task<bool?> DeleteTranslationAsync(string slug, string lang)
    {
        var post = await _blogRepo.GetBySlugAsync(slug);
        if (post == null) return null;

        if (!post.Translations.Remove(lang)) return false;

        var update = Builders<BlogPostEntity>.Update
            .Set(p => p.Translations, post.Translations)
            .Set(p => p.UpdatedAt, DateTime.UtcNow);

        await _blogRepo.FindOneAndUpdateAsync(slug, update);
        return true;
    }

    // Helpers

    private static string GenerateAuthorSlug(UserEntity user)
    {
        return $"{user.FirstName}-{user.LastName}".ToLowerInvariant().Replace(" ", "-");
    }

    private BlogPostResponse MapToPublicResponse(BlogPostEntity doc, BlogPostTranslation? translation = null, UserEntity? author = null)
    {
        var response = _mapper.Map<BlogPostResponse>(doc);
        if (translation != null)
        {
            response.Title = translation.Title ?? response.Title;
            response.Excerpt = translation.Excerpt ?? response.Excerpt;
            response.Content = translation.Content ?? response.Content;
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

    private async Task UnfeatureOthersInCategoryAsync(string category, string excludeId)
    {
        var filter = Builders<BlogPostEntity>.Filter.And(
            Builders<BlogPostEntity>.Filter.Eq(p => p.Category, category),
            Builders<BlogPostEntity>.Filter.Eq(p => p.IsFeatured, true),
            Builders<BlogPostEntity>.Filter.Ne(p => p.Id, excludeId)
        );
        var update = Builders<BlogPostEntity>.Update.Set(p => p.IsFeatured, false);
        await _blogRepo.UpdateManyAsync(filter, update);
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
