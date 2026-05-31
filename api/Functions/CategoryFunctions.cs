using System.Net;
using Api.DTOs.Categories;
using Api.Exceptions;
using Api.Helpers;
using Api.Services.Interfaces;
using FluentValidation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace Api.Functions;

// NOTE: All category CRUD + public reads now live in the Cloudflare Worker (D1).
// Only AI translation remains here, since the Worker proxies translate requests
// to Azure for compute (see src/server/db/admin-routes.ts → category translate).
public class CategoryFunctions
{
    private readonly ICategoryService _categoryService;
    private readonly ITranslationService _translationService;
    private readonly AuthHelper _auth;
    private readonly IValidator<TranslateCategoryRequest> _translateValidator;

    public CategoryFunctions(
        ICategoryService categoryService,
        ITranslationService translationService,
        AuthHelper auth,
        IValidator<TranslateCategoryRequest> translateValidator)
    {
        _categoryService = categoryService;
        _translationService = translationService;
        _auth = auth;
        _translateValidator = translateValidator;
    }

    [Function("AdminTranslateCategory")]
    public async Task<HttpResponseData> AdminTranslate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/categories/{id}/translate")] HttpRequestData req,
        string id)
    {
        await _auth.RequirePermissionAsync(req, "manage:categories");
        var request = await FunctionHelper.DeserializeAndValidateAsync<TranslateCategoryRequest>(req, _translateValidator);

        var targets = request.Targets
            .Where(t => !string.IsNullOrWhiteSpace(t.LocaleCode) && !string.IsNullOrWhiteSpace(t.TranslatorCode))
            .Select(t => (t.LocaleCode, t.TranslatorCode));

        var sourceLang = request.SourceLocale.Split('-')[0];
        var result = await _categoryService.TranslateAsync(id, targets, _translationService, request.Label, sourceLang)
            ?? throw new NotFoundException("Category not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, result);
    }
}
