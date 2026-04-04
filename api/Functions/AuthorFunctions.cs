using System.Net;
using Api.DTOs.Authors;
using Api.Entities;
using Api.Exceptions;
using Api.Helpers;
using Api.Services.Interfaces;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace Api.Functions;

public class AuthorFunctions
{
    private readonly IUserService _userService;
    private readonly IBlogService _blogService;
    private readonly AuthHelper _auth;

    public AuthorFunctions(IUserService userService, IBlogService blogService, AuthHelper auth)
    {
        _userService = userService;
        _blogService = blogService;
        _auth = auth;
    }

    // Public endpoints

    [Function("GetAuthors")]
    public async Task<HttpResponseData> GetAuthors(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "authors")] HttpRequestData req)
    {
        var candidates = await _userService.GetAuthorCandidatesAsync();
        var candidateIds = candidates.Select(u => u.Id).ToHashSet();
        var postCounts = await _blogService.GetPostCountsByAuthorIdsAsync(candidateIds);

        var authorIdsWithPosts = postCounts.Keys.ToList();
        var additionalAuthorIds = authorIdsWithPosts.Where(id => !candidateIds.Contains(id)).ToList();
        var additionalAuthors = additionalAuthorIds.Count > 0
            ? await _userService.GetByIdsAsync(additionalAuthorIds)
            : [];

        var allAuthors = candidates.Concat(additionalAuthors).ToList();
        var response = allAuthors.Select(u => MapToAuthorResponse(u, postCounts.GetValueOrDefault(u.Id, 0))).ToList();

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, response);
    }

    [Function("GetAuthorBySlug")]
    public async Task<HttpResponseData> GetAuthorBySlug(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "authors/{slug}")] HttpRequestData req,
        string slug)
    {
        var user = await _userService.GetBySlugAsync(slug)
            ?? throw new NotFoundException("Author not found.");

        var lang = req.Query["lang"];
        var postCounts = await _blogService.GetPostCountsByAuthorIdsAsync([user.Id]);
        var response = MapToAuthorResponse(user, postCounts.GetValueOrDefault(user.Id, 0));

        // Apply translation overlay if requested
        if (lang != null && user.PageTranslations.TryGetValue(lang, out var translation))
        {
            if (!string.IsNullOrEmpty(translation.Bio)) response.Bio = translation.Bio;
            if (!string.IsNullOrEmpty(translation.PageContent)) response.PageContent = translation.PageContent;
        }

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, response);
    }

    // Admin endpoints

    [Function("AdminGetAuthors")]
    public async Task<HttpResponseData> AdminGetAuthors(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "manage/authors")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "manage:users");

        var candidates = await _userService.GetAuthorCandidatesAsync();
        var candidateIds = candidates.Select(u => u.Id).ToHashSet();
        var postCounts = await _blogService.GetPostCountsByAuthorIdsAsync(candidateIds);

        var response = candidates.Select(u => MapToAuthorResponse(u, postCounts.GetValueOrDefault(u.Id, 0))).ToList();
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, response);
    }

    [Function("AdminUpdateAuthor")]
    public async Task<HttpResponseData> AdminUpdateAuthor(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "manage/authors/{id}")] HttpRequestData req,
        string id)
    {
        await _auth.RequirePermissionAsync(req, "manage:users");

        var request = await FunctionHelper.DeserializeAndValidateAsync<UpdateAuthorProfileRequest>(req);
        var user = await _userService.GetByIdAsync(id)
            ?? throw new NotFoundException("User not found.");

        var updates = new Api.DTOs.Auth.UpdateProfileRequest
        {
            Bio = request.Bio,
            Profession = request.Profession,
            Expertise = request.Expertise,
            SocialLinks = request.SocialLinks,
            Slug = request.Slug,
        };

        await _userService.UpdateProfileAsync(id, updates);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { message = "Author profile updated." });
    }

    private static AuthorResponse MapToAuthorResponse(UserEntity user, int postCount) => new()
    {
        Id = user.Id,
        Slug = user.Slug ?? $"{user.FirstName}-{user.LastName}".ToLowerInvariant().Replace(" ", "-"),
        FirstName = user.FirstName,
        LastName = user.LastName,
        AvatarUrl = user.AvatarUrl,
        Bio = user.Bio,
        Profession = user.Profession,
        Expertise = user.Expertise,
        SocialLinks = user.SocialLinks,
        PageContent = user.PageContent,
        PostCount = postCount,
    };
}
