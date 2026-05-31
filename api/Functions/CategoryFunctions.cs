using System.Net;
using Api.DTOs.Categories;
using Api.Exceptions;
using Api.Helpers;
using Api.Services.Interfaces;
using FluentValidation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;

namespace Api.Functions;

// NOTE: All category CRUD + public reads now live in the Cloudflare Worker (D1).
// Only AI translation remains here, since the Worker proxies translate requests
// to Azure for compute (see src/server/db/admin-routes.ts → category translate).
// No user auth on Azure — the Worker forwards a shared secret (InternalAuth).
public class CategoryFunctions
{
    private readonly ICategoryService _categoryService;
    private readonly ITranslationService _translationService;
    private readonly IConfiguration _config;
    private readonly IValidator<TranslateCategoryRequest> _translateValidator;

    public CategoryFunctions(
        ICategoryService categoryService,
        ITranslationService translationService,
        IConfiguration config,
        IValidator<TranslateCategoryRequest> translateValidator)
    {
        _categoryService = categoryService;
        _translationService = translationService;
        _config = config;
        _translateValidator = translateValidator;
    }

    [Function("AdminTranslateCategory")]
    public async Task<HttpResponseData> AdminTranslate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/categories/{id}/translate")] HttpRequestData req,
        string id)
    {
        InternalAuth.Verify(req, _config);
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
