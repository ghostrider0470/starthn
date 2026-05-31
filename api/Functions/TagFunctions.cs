using System.Net;
using Api.DTOs.Tags;
using Api.Exceptions;
using Api.Helpers;
using Api.Services.Interfaces;
using FluentValidation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace Api.Functions;

// NOTE: All tag CRUD + public reads now live in the Cloudflare Worker (D1).
// Only AI translation remains here, since the Worker proxies translate requests
// to Azure for compute (see src/server/db/admin-routes.ts → tag translate).
public class TagFunctions
{
    private readonly ITagService _tagService;
    private readonly ITranslationService _translationService;
    private readonly AuthHelper _auth;
    private readonly IValidator<TranslateTagRequest> _translateValidator;

    public TagFunctions(
        ITagService tagService,
        ITranslationService translationService,
        AuthHelper auth,
        IValidator<TranslateTagRequest> translateValidator)
    {
        _tagService = tagService;
        _translationService = translationService;
        _auth = auth;
        _translateValidator = translateValidator;
    }

    [Function("AdminTranslateTag")]
    public async Task<HttpResponseData> AdminTranslate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/tags/{id}/translate")] HttpRequestData req,
        string id)
    {
        await _auth.RequirePermissionAsync(req, "manage:tags");
        var request = await FunctionHelper.DeserializeAndValidateAsync<TranslateTagRequest>(req, _translateValidator);

        var targets = request.Targets
            .Where(t => !string.IsNullOrWhiteSpace(t.LocaleCode) && !string.IsNullOrWhiteSpace(t.TranslatorCode))
            .Select(t => (t.LocaleCode, t.TranslatorCode));

        var sourceLang = request.SourceLocale.Split('-')[0];
        var result = await _tagService.TranslateAsync(id, targets, _translationService, request.Label, sourceLang)
            ?? throw new NotFoundException("Tag not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, result);
    }
}
