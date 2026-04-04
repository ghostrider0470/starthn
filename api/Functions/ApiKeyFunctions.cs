using System.Net;
using Api.DTOs.Auth;
using Api.Exceptions;
using Api.Helpers;
using Api.Services.Interfaces;
using FluentValidation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace Api.Functions;

public class ApiKeyFunctions
{
    private readonly IApiKeyService _apiKeyService;
    private readonly AuthHelper _auth;
    private readonly IValidator<CreateApiKeyRequest> _createValidator;

    public ApiKeyFunctions(IApiKeyService apiKeyService, AuthHelper auth, IValidator<CreateApiKeyRequest> createValidator)
    {
        _apiKeyService = apiKeyService;
        _auth = auth;
        _createValidator = createValidator;
    }

    [Function("CreateApiKey")]
    public async Task<HttpResponseData> Create(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "user/api-keys")] HttpRequestData req)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);
        var request = await FunctionHelper.DeserializeAndValidateAsync<CreateApiKeyRequest>(req, _createValidator);
        var result = await _apiKeyService.CreateAsync(userId, request);
        return await req.CreateJsonResponseAsync(HttpStatusCode.Created, result);
    }

    [Function("ListApiKeys")]
    public async Task<HttpResponseData> List(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "user/api-keys")] HttpRequestData req)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);
        var keys = await _apiKeyService.ListAsync(userId);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, keys);
    }

    [Function("DeleteApiKey")]
    public async Task<HttpResponseData> Delete(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "user/api-keys/{keyId}")] HttpRequestData req,
        string keyId)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);
        var deleted = await _apiKeyService.DeleteAsync(userId, keyId);
        if (!deleted)
            throw new NotFoundException("API key not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { message = "API key revoked." });
    }
}
