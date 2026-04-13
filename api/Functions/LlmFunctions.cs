using System.Net;
using Api.DTOs.LlmProviders;
using Api.Exceptions;
using Api.Helpers;
using Api.Services.Interfaces;
using FluentValidation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace Api.Functions;

public class LlmFunctions
{
    private readonly ILlmProviderService _llmService;
    private readonly AuthHelper _auth;
    private readonly IValidator<CreateLlmProviderRequest> _createProviderValidator;
    private readonly IValidator<UpdateLlmProviderRequest> _updateProviderValidator;
    private readonly IValidator<UpdateLlmSettingsRequest> _updateSettingsValidator;

    public LlmFunctions(
        ILlmProviderService llmService,
        AuthHelper auth,
        IValidator<CreateLlmProviderRequest> createProviderValidator,
        IValidator<UpdateLlmProviderRequest> updateProviderValidator,
        IValidator<UpdateLlmSettingsRequest> updateSettingsValidator)
    {
        _llmService = llmService;
        _auth = auth;
        _createProviderValidator = createProviderValidator;
        _updateProviderValidator = updateProviderValidator;
        _updateSettingsValidator = updateSettingsValidator;
    }

    // Providers

    [Function("AdminGetLlmProviders")]
    public async Task<HttpResponseData> GetProviders(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "manage/llm/providers")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "view:admin");
        var providers = await _llmService.GetAllProvidersAsync();
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, providers);
    }

    [Function("AdminCreateLlmProvider")]
    public async Task<HttpResponseData> CreateProvider(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/llm/providers")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "view:admin");
        var request = await FunctionHelper.DeserializeAndValidateAsync<CreateLlmProviderRequest>(req, _createProviderValidator);
        var result = await _llmService.CreateProviderAsync(request);
        return await req.CreateJsonResponseAsync(HttpStatusCode.Created, result);
    }

    [Function("AdminUpdateLlmProvider")]
    public async Task<HttpResponseData> UpdateProvider(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "manage/llm/providers/{key}")] HttpRequestData req,
        string key)
    {
        await _auth.RequirePermissionAsync(req, "view:admin");
        var request = await FunctionHelper.DeserializeAndValidateAsync<UpdateLlmProviderRequest>(req, _updateProviderValidator);
        var result = await _llmService.UpdateProviderAsync(key, request)
            ?? throw new NotFoundException("Provider not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, result);
    }

    [Function("AdminDeleteLlmProvider")]
    public async Task<HttpResponseData> DeleteProvider(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "manage/llm/providers/{key}")] HttpRequestData req,
        string key)
    {
        await _auth.RequirePermissionAsync(req, "view:admin");
        if (!await _llmService.DeleteProviderAsync(key))
            throw new NotFoundException("Provider not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { message = "Provider deleted." });
    }

    // Settings

    [Function("AdminGetLlmSettings")]
    public async Task<HttpResponseData> GetSettings(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "manage/llm/settings")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "view:admin");
        var settings = await _llmService.GetSettingsAsync();
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, settings);
    }

    [Function("AdminUpdateLlmSettings")]
    public async Task<HttpResponseData> UpdateSettings(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "manage/llm/settings")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "view:admin");
        var request = await FunctionHelper.DeserializeAndValidateAsync<UpdateLlmSettingsRequest>(req, _updateSettingsValidator);
        var result = await _llmService.UpdateSettingsAsync(request);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, result);
    }
}
