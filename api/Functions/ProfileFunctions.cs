using System.Net;
using Api.DTOs.Auth;
using Api.Exceptions;
using Api.Helpers;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;

namespace Api.Functions;

// NOTE: All profile CRUD, avatar/image upload, and page-translation persistence now
// live in the Cloudflare Worker (D1 + R2). Only AI page translation remains here,
// since the Worker proxies the translate request to Azure for compute
// (see src/server/routes/profile.ts). No user auth on Azure — the Worker
// authenticates the user, forwards a shared secret (InternalAuth) and the resolved
// user id (X-User-Id).
public class ProfileFunctions
{
    private readonly IUserService _userService;
    private readonly ITranslationService _translationService;
    private readonly IUserPageTranslationRepository _pageTranslationRepo;
    private readonly IConfiguration _config;

    public ProfileFunctions(
        IUserService userService,
        ITranslationService translationService,
        IUserPageTranslationRepository pageTranslationRepo,
        IConfiguration config)
    {
        _userService = userService;
        _translationService = translationService;
        _pageTranslationRepo = pageTranslationRepo;
        _config = config;
    }

    [Function("TranslateUserPage")]
    public async Task<HttpResponseData> TranslateUserPage(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "user/page/translate")] HttpRequestData req)
    {
        InternalAuth.Verify(req, _config);
        var userId = InternalAuth.RequireUserId(req);
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
}
