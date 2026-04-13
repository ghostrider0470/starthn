using System.Net;
using System.Text.Json;
using Api.DTOs.Auth;
using Api.Entities;
using Api.Exceptions;
using Api.Helpers;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using FluentValidation;
using HttpMultipartParser;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace Api.Functions;

public class ProfileFunctions
{
    private const string AvatarContainer = "avatars";
    private const string PageImageContainer = "page-images";
    private static readonly int[] AvatarWidths = [48, 96, 192];

    /// <summary>
    /// Extract HTML from Cosmos pageContent (List&lt;object&gt; of JsonElements).
    /// Each element may be a plain string or an object with content/html/text field.
    /// </summary>
    internal static string? ExtractPageHtml(List<object>? blocks)
    {
        if (blocks == null || blocks.Count == 0) return null;
        return string.Join("\n", blocks.Select(c =>
        {
            if (c is JsonElement je)
            {
                if (je.ValueKind == JsonValueKind.String) return je.GetString() ?? "";
                if (je.ValueKind == JsonValueKind.Object)
                {
                    if (je.TryGetProperty("content", out var content) && content.ValueKind == JsonValueKind.String)
                        return content.GetString() ?? "";
                    if (je.TryGetProperty("html", out var html) && html.ValueKind == JsonValueKind.String)
                        return html.GetString() ?? "";
                    if (je.TryGetProperty("text", out var text) && text.ValueKind == JsonValueKind.String)
                        return text.GetString() ?? "";
                }
            }
            return c?.ToString() ?? "";
        }));
    }
    private static readonly int[] ContentWidths = [400, 800, 1200, 1600, 2000];

    private readonly IUserService _userService;
    private readonly IBlobStorageService _blobService;
    private readonly IImageProcessingService _imageProcessor;
    private readonly IProcessedImageRepository _processedRepo;
    private readonly IWorkerSyncService _manifestSync;
    private readonly ITranslationService _translationService;
    private readonly IUserPageTranslationRepository _pageTranslationRepo;
    private readonly AuthHelper _auth;
    private readonly IValidator<UpdateProfileRequest> _updateProfileValidator;
    private readonly IValidator<ChangePasswordRequest> _changePasswordValidator;
    private readonly ILogger<ProfileFunctions> _logger;

    public ProfileFunctions(
        IUserService userService,
        IBlobStorageService blobService,
        IImageProcessingService imageProcessor,
        IProcessedImageRepository processedRepo,
        IWorkerSyncService manifestSync,
        ITranslationService translationService,
        IUserPageTranslationRepository pageTranslationRepo,
        AuthHelper auth,
        IValidator<UpdateProfileRequest> updateProfileValidator,
        IValidator<ChangePasswordRequest> changePasswordValidator,
        ILogger<ProfileFunctions> logger)
    {
        _userService = userService;
        _blobService = blobService;
        _imageProcessor = imageProcessor;
        _processedRepo = processedRepo;
        _manifestSync = manifestSync;
        _translationService = translationService;
        _pageTranslationRepo = pageTranslationRepo;
        _auth = auth;
        _updateProfileValidator = updateProfileValidator;
        _changePasswordValidator = changePasswordValidator;
        _logger = logger;
    }

    [Function("GetProfile")]
    public async Task<HttpResponseData> GetProfile(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "user/profile")] HttpRequestData req)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);
        var user = await _userService.GetByIdAsync(userId)
            ?? throw new NotFoundException("User not found.");

        var profile = new
        {
            id = user.Id,
            email = user.Email,
            firstName = user.FirstName,
            lastName = user.LastName,
            phoneNumber = user.PhoneNumber,
            avatarUrl = user.AvatarUrl,
            isActive = user.IsActive,
            isOptedOut = user.IsOptedOut,
            roles = user.Roles,
            emailNotifications = user.EmailNotifications,
            smsNotifications = user.SmsNotifications,
            bio = user.Bio,
            profession = user.Profession,
            expertise = user.Expertise,
            socialLinks = user.SocialLinks,
            slug = user.Slug,
            pageContent = ExtractPageHtml(user.PageContent),
        };

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, profile);
    }

    [Function("UpdateProfile")]
    public async Task<HttpResponseData> UpdateProfile(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "user/profile")] HttpRequestData req)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);
        var request = await FunctionHelper.DeserializeAndValidateAsync<UpdateProfileRequest>(req, _updateProfileValidator);
        await _userService.UpdateProfileAsync(userId, request);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { message = "Profile updated." });
    }

    [Function("ChangePassword")]
    public async Task<HttpResponseData> ChangePassword(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "user/change-password")] HttpRequestData req)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);
        var request = await FunctionHelper.DeserializeAndValidateAsync<ChangePasswordRequest>(req, _changePasswordValidator);
        await _userService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { message = "Password changed successfully." });
    }

    [Function("UploadPageImage")]
    public async Task<HttpResponseData> UploadPageImage(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "user/page-image")] HttpRequestData req)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);

        var parsed = await MultipartFormDataParser.ParseAsync(req.Body);
        var file = parsed.Files.FirstOrDefault()
            ?? throw new AppValidationException("file", "No image file provided.");

        // Buffer stream — needed for both upload and variant generation
        using var ms = new MemoryStream();
        await file.Data.CopyToAsync(ms);
        ms.Position = 0;

        var blobPath = $"{userId}/{Guid.NewGuid():N}.webp";

        // Upload original
        await _blobService.UploadImageAsync(PageImageContainer, blobPath, ms, file.ContentType);

        // Generate and upload variants
        ms.Position = 0;
        var variants = await _imageProcessor.GenerateWebpVariantsAsync(ms, ContentWidths);
        foreach (var v in variants)
            await _blobService.UploadVariantAsync(PageImageContainer, blobPath, v.Width, v.Data);

        var processedAt = DateTime.UtcNow;
        await _blobService.SetProcessedMetadataAsync(PageImageContainer, blobPath, "backend", processedAt);

        var manifestPath = $"{PageImageContainer}/{blobPath}";
        var manifest = new ProcessedImageEntity
        {
            Path = manifestPath,
            Container = PageImageContainer,
            Format = "webp",
            Widths = ContentWidths,
            ProcessedAt = processedAt,
            Source = "backend",
        };
        await _processedRepo.UpsertAsync(manifest);

        // Fire-and-forget sync + warm
        _ = SyncManifestToD1Async(manifest);
        _ = _manifestSync.WarmAsync(manifest.Path, manifest.Widths, manifest.ProcessedAt.ToString("O"));

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { url = manifestPath });
    }

    // ── Page Translations ──────────────────────────────────────────────────

    [Function("TranslateUserPage")]
    public async Task<HttpResponseData> TranslateUserPage(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "user/page/translate")] HttpRequestData req)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);
        var user = await _userService.GetByIdAsync(userId)
            ?? throw new NotFoundException("User not found.");

        var body = await FunctionHelper.DeserializeAndValidateAsync<TranslatePageRequest>(req);

        foreach (var lang in body.Languages)
        {
            var translation = await _translationService.TranslateUserPageAsync(user, lang);
            await _pageTranslationRepo.UpsertAsync(translation);
        }

        var all = await _pageTranslationRepo.GetAllForUserAsDictAsync(userId);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, all);
    }

    [Function("GetUserPageTranslations")]
    public async Task<HttpResponseData> GetUserPageTranslations(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "user/page/translations")] HttpRequestData req)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);
        // Verify user exists
        _ = await _userService.GetByIdAsync(userId)
            ?? throw new NotFoundException("User not found.");

        var translations = await _pageTranslationRepo.GetAllForUserAsDictAsync(userId);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, translations);
    }

    [Function("UpdateUserPageTranslation")]
    public async Task<HttpResponseData> UpdateUserPageTranslation(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "user/page/translations/{lang}")] HttpRequestData req,
        string lang)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);
        _ = await _userService.GetByIdAsync(userId)
            ?? throw new NotFoundException("User not found.");

        var body = await FunctionHelper.DeserializeAndValidateAsync<UpdatePageTranslationRequest>(req);

        var existing = await _pageTranslationRepo.GetAsync(userId, lang) ?? new UserPageTranslationEntity
        {
            UserId = userId,
            Lang = lang,
        };

        if (body.Bio != null) existing.Bio = body.Bio;
        if (body.PageContent != null) existing.PageContent = new List<object> { body.PageContent };
        existing.IsAutoTranslated = false;
        existing.TranslatedAt = DateTime.UtcNow;

        await _pageTranslationRepo.UpsertAsync(existing);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, existing);
    }

    [Function("DeleteUserPageTranslation")]
    public async Task<HttpResponseData> DeleteUserPageTranslation(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "user/page/translations/{lang}")] HttpRequestData req,
        string lang)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);
        _ = await _userService.GetByIdAsync(userId)
            ?? throw new NotFoundException("User not found.");

        var existing = await _pageTranslationRepo.GetAsync(userId, lang)
            ?? throw new NotFoundException("Translation not found.");

        await _pageTranslationRepo.DeleteAsync(userId, lang);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { message = "Translation deleted." });
    }

    // ── Avatar ──────────────────────────────────────────────────────────────

    [Function("UploadAvatar")]
    public async Task<HttpResponseData> UploadAvatar(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "user/avatar")] HttpRequestData req)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);

        // Read current user to capture old avatarUrl before overwriting
        var user = await _userService.GetByIdAsync(userId)
            ?? throw new NotFoundException("User not found.");
        var oldAvatarUrl = user.AvatarUrl;

        var parsed = await MultipartFormDataParser.ParseAsync(req.Body);
        var file = parsed.Files.FirstOrDefault()
            ?? throw new AppValidationException("file", "No image file provided.");

        // Buffer stream — needed for both upload and variant generation
        using var ms = new MemoryStream();
        await file.Data.CopyToAsync(ms);
        ms.Position = 0;

        var blobPath = $"{userId}/{Guid.NewGuid():N}.webp";

        // Upload original
        await _blobService.UploadImageAsync(AvatarContainer, blobPath, ms, file.ContentType);

        // Generate and upload variants
        ms.Position = 0;
        var variants = await _imageProcessor.GenerateWebpVariantsAsync(ms, AvatarWidths);
        foreach (var v in variants)
            await _blobService.UploadVariantAsync(AvatarContainer, blobPath, v.Width, v.Data);

        var processedAt = DateTime.UtcNow;
        await _blobService.SetProcessedMetadataAsync(AvatarContainer, blobPath, "backend", processedAt);

        var manifestPath = $"{AvatarContainer}/{blobPath}";
        var manifest = new ProcessedImageEntity
        {
            Path = manifestPath,
            Container = AvatarContainer,
            Format = "webp",
            Widths = AvatarWidths,
            ProcessedAt = processedAt,
            Source = "backend",
        };
        await _processedRepo.UpsertAsync(manifest);

        // Persist new avatarUrl on user document
        await _userService.UpdateAvatarAsync(userId, manifestPath);

        // Fire-and-forget: delete old avatar, sync new manifest, warm R2
        if (!string.IsNullOrWhiteSpace(oldAvatarUrl))
            _ = DeleteOldAvatarAsync(oldAvatarUrl);
        _ = SyncManifestToD1Async(manifest);
        _ = _manifestSync.WarmAsync(manifest.Path, manifest.Widths, manifest.ProcessedAt.ToString("O"));

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { avatarUrl = manifestPath });
    }

    [Function("RemoveAvatar")]
    public async Task<HttpResponseData> RemoveAvatar(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "user/avatar")] HttpRequestData req)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);

        var user = await _userService.GetByIdAsync(userId)
            ?? throw new NotFoundException("User not found.");

        if (!string.IsNullOrWhiteSpace(user.AvatarUrl))
            await DeleteOldAvatarAsync(user.AvatarUrl);

        await _userService.UpdateAvatarAsync(userId, null);

        var response = req.CreateResponse(HttpStatusCode.NoContent);
        return response;
    }

    private async Task DeleteOldAvatarAsync(string oldPath)
    {
        try
        {
            var relativePath = oldPath.StartsWith($"{AvatarContainer}/")
                ? oldPath[($"{AvatarContainer}/".Length)..]
                : oldPath;
            await _blobService.DeleteBlobWithVariantsAsync(AvatarContainer, relativePath);
            await _processedRepo.DeleteAsync(oldPath);

            // Propagate deletion to D1 via sync endpoint
            var deletePayload = System.Text.Json.JsonSerializer.SerializeToElement(
                new { path = oldPath, _deleted = true });
            _ = _manifestSync.SyncEntityAsync("processedImages", [deletePayload]);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete old avatar: {Path}", oldPath);
        }
    }

    private Task SyncManifestToD1Async(ProcessedImageEntity manifest)
    {
        var element = JsonSerializer.SerializeToElement(manifest);
        return _manifestSync.SyncEntityAsync("processedImages", [element]);
    }
}
