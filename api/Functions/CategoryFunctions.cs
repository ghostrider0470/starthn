using System.Net;
using Api.DTOs.Categories;
using Api.Exceptions;
using Api.Helpers;
using Api.Services.Interfaces;
using FluentValidation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace Api.Functions;

public class CategoryFunctions
{
    private readonly ICategoryService _categoryService;
    private readonly ITranslationService _translationService;
    private readonly AuthHelper _auth;
    private readonly IValidator<CreateCategoryRequest> _createValidator;
    private readonly IValidator<UpdateCategoryRequest> _updateValidator;
    private readonly IValidator<TranslateCategoryRequest> _translateValidator;

    public CategoryFunctions(
        ICategoryService categoryService,
        ITranslationService translationService,
        AuthHelper auth,
        IValidator<CreateCategoryRequest> createValidator,
        IValidator<UpdateCategoryRequest> updateValidator,
        IValidator<TranslateCategoryRequest> translateValidator)
    {
        _categoryService = categoryService;
        _translationService = translationService;
        _auth = auth;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _translateValidator = translateValidator;
    }

    // Public endpoint

    [Function("GetPublicCategories")]
    public async Task<HttpResponseData> GetPublic(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "blog/categories")] HttpRequestData req)
    {
        var categories = await _categoryService.GetAllAsync();
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, categories);
    }

    // Admin endpoints

    [Function("AdminGetCategories")]
    public async Task<HttpResponseData> AdminGetAll(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "manage/categories")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "manage:categories");
        var categories = await _categoryService.GetAllAsync();
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, categories);
    }

    [Function("AdminCreateCategory")]
    public async Task<HttpResponseData> AdminCreate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/categories")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "manage:categories");
        var request = await FunctionHelper.DeserializeAndValidateAsync<CreateCategoryRequest>(req, _createValidator);
        var result = await _categoryService.CreateAsync(request);
        return await req.CreateJsonResponseAsync(HttpStatusCode.Created, result);
    }

    [Function("AdminUpdateCategory")]
    public async Task<HttpResponseData> AdminUpdate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "manage/categories/{id}")] HttpRequestData req,
        string id)
    {
        await _auth.RequirePermissionAsync(req, "manage:categories");
        var request = await FunctionHelper.DeserializeAndValidateAsync<UpdateCategoryRequest>(req, _updateValidator);
        var result = await _categoryService.UpdateAsync(id, request)
            ?? throw new NotFoundException("Category not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, result);
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

        var result = await _categoryService.TranslateAsync(id, targets, _translationService)
            ?? throw new NotFoundException("Category not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, result);
    }

    [Function("AdminDeleteCategory")]
    public async Task<HttpResponseData> AdminDelete(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "manage/categories/{id}")] HttpRequestData req,
        string id)
    {
        await _auth.RequirePermissionAsync(req, "manage:categories");
        if (!await _categoryService.DeleteAsync(id))
            throw new NotFoundException("Category not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { message = "Category deleted." });
    }
}
