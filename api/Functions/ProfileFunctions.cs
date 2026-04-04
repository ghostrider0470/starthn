using System.Net;
using Api.DTOs.Auth;
using Api.Exceptions;
using Api.Helpers;
using Api.Services.Interfaces;
using FluentValidation;
using HttpMultipartParser;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace Api.Functions;

public class ProfileFunctions
{
    private readonly IUserService _userService;
    private readonly IBlobStorageService _blobService;
    private readonly ITranslationService _translationService;
    private readonly AuthHelper _auth;
    private readonly IValidator<UpdateProfileRequest> _updateProfileValidator;
    private readonly IValidator<ChangePasswordRequest> _changePasswordValidator;

    public ProfileFunctions(
        IUserService userService,
        IBlobStorageService blobService,
        ITranslationService translationService,
        AuthHelper auth,
        IValidator<UpdateProfileRequest> updateProfileValidator,
        IValidator<ChangePasswordRequest> changePasswordValidator)
    {
        _userService = userService;
        _blobService = blobService;
        _translationService = translationService;
        _auth = auth;
        _updateProfileValidator = updateProfileValidator;
        _changePasswordValidator = changePasswordValidator;
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
            pageContent = user.PageContent,
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
        await _auth.RequireAuthAsync(req);

        var parsed = await MultipartFormDataParser.ParseAsync(req.Body);
        var file = parsed.Files.FirstOrDefault()
            ?? throw new AppValidationException("file", "No image file provided.");

        var url = await _blobService.UploadImageAsync(file.Data, file.FileName, file.ContentType);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { url });
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
            user.PageTranslations[lang] = translation;
        }

        await _userService.UpdatePageTranslationsAsync(userId, user.PageTranslations);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, user.PageTranslations);
    }

    [Function("GetUserPageTranslations")]
    public async Task<HttpResponseData> GetUserPageTranslations(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "user/page/translations")] HttpRequestData req)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);
        var user = await _userService.GetByIdAsync(userId)
            ?? throw new NotFoundException("User not found.");

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, user.PageTranslations);
    }

    [Function("UpdateUserPageTranslation")]
    public async Task<HttpResponseData> UpdateUserPageTranslation(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "user/page/translations/{lang}")] HttpRequestData req,
        string lang)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);
        var user = await _userService.GetByIdAsync(userId)
            ?? throw new NotFoundException("User not found.");

        var body = await FunctionHelper.DeserializeAndValidateAsync<UpdatePageTranslationRequest>(req);

        if (!user.PageTranslations.TryGetValue(lang, out var translation))
            translation = new PageTranslation();

        if (body.Bio != null) translation.Bio = body.Bio;
        if (body.PageContent != null) translation.PageContent = body.PageContent;
        translation.IsAutoTranslated = false;
        translation.TranslatedAt = DateTime.UtcNow;

        user.PageTranslations[lang] = translation;
        await _userService.UpdatePageTranslationsAsync(userId, user.PageTranslations);

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, translation);
    }

    [Function("DeleteUserPageTranslation")]
    public async Task<HttpResponseData> DeleteUserPageTranslation(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "user/page/translations/{lang}")] HttpRequestData req,
        string lang)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);
        var user = await _userService.GetByIdAsync(userId)
            ?? throw new NotFoundException("User not found.");

        if (!user.PageTranslations.Remove(lang))
            throw new NotFoundException("Translation not found.");

        await _userService.UpdatePageTranslationsAsync(userId, user.PageTranslations);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { message = "Translation deleted." });
    }

    // ── Avatar ──────────────────────────────────────────────────────────────

    [Function("UploadAvatar")]
    public async Task<HttpResponseData> UploadAvatar(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "user/avatar")] HttpRequestData req)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);

        var parsed = await MultipartFormDataParser.ParseAsync(req.Body);
        var file = parsed.Files.FirstOrDefault()
            ?? throw new AppValidationException("file", "No image file provided.");

        var avatarUrl = await _blobService.UploadImageAsync(file.Data, file.FileName, file.ContentType);
        await _userService.UpdateAvatarAsync(userId, avatarUrl);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { avatarUrl });
    }
}
