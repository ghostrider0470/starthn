using System.Net;
using Api.DTOs.Tags;
using Api.Exceptions;
using Api.Helpers;
using Api.Services.Interfaces;
using FluentValidation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace Api.Functions;

public class TagFunctions
{
    private readonly ITagService _tagService;
    private readonly ITranslationService _translationService;
    private readonly AuthHelper _auth;
    private readonly IValidator<CreateTagRequest> _createValidator;
    private readonly IValidator<UpdateTagRequest> _updateValidator;
    private readonly IValidator<TranslateTagRequest> _translateValidator;

    public TagFunctions(
        ITagService tagService,
        ITranslationService translationService,
        AuthHelper auth,
        IValidator<CreateTagRequest> createValidator,
        IValidator<UpdateTagRequest> updateValidator,
        IValidator<TranslateTagRequest> translateValidator)
    {
        _tagService = tagService;
        _translationService = translationService;
        _auth = auth;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _translateValidator = translateValidator;
    }

    // Public endpoint

    [Function("GetPublicTags")]
    public async Task<HttpResponseData> GetPublic(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "blog/tags")] HttpRequestData req)
    {
        var tags = await _tagService.GetAllAsync();
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, tags);
    }

    // Admin endpoints

    [Function("AdminGetTags")]
    public async Task<HttpResponseData> AdminGetAll(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "manage/tags")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "manage:tags");
        var tags = await _tagService.GetAllAsync();
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, tags);
    }

    [Function("AdminCreateTag")]
    public async Task<HttpResponseData> AdminCreate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/tags")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "manage:tags");
        var request = await FunctionHelper.DeserializeAndValidateAsync<CreateTagRequest>(req, _createValidator);
        var result = await _tagService.CreateAsync(request);
        return await req.CreateJsonResponseAsync(HttpStatusCode.Created, result);
    }

    [Function("AdminUpdateTag")]
    public async Task<HttpResponseData> AdminUpdate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "manage/tags/{id}")] HttpRequestData req,
        string id)
    {
        await _auth.RequirePermissionAsync(req, "manage:tags");
        var request = await FunctionHelper.DeserializeAndValidateAsync<UpdateTagRequest>(req, _updateValidator);
        var result = await _tagService.UpdateAsync(id, request)
            ?? throw new NotFoundException("Tag not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, result);
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

        var result = await _tagService.TranslateAsync(id, targets, _translationService)
            ?? throw new NotFoundException("Tag not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, result);
    }

    [Function("AdminDeleteTag")]
    public async Task<HttpResponseData> AdminDelete(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "manage/tags/{id}")] HttpRequestData req,
        string id)
    {
        await _auth.RequirePermissionAsync(req, "manage:tags");
        if (!await _tagService.DeleteAsync(id))
            throw new NotFoundException("Tag not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { message = "Tag deleted." });
    }
}
