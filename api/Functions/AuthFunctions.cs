using System.Net;
using Api.DTOs.Auth;
using Api.Helpers;
using Api.Services.Interfaces;
using FluentValidation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace Api.Functions;

public class AuthFunctions
{
    private readonly IAuthService _authService;
    private readonly AuthHelper _auth;
    private readonly IValidator<RegisterRequest> _registerValidator;
    private readonly IValidator<LoginRequest> _loginValidator;
    private readonly IValidator<ExternalLoginRequest> _externalLoginValidator;
    private readonly IValidator<ExchangeCodeRequest> _exchangeCodeValidator;
    private readonly IValidator<RefreshTokenRequest> _refreshTokenValidator;

    public AuthFunctions(
        IAuthService authService,
        AuthHelper auth,
        IValidator<RegisterRequest> registerValidator,
        IValidator<LoginRequest> loginValidator,
        IValidator<ExternalLoginRequest> externalLoginValidator,
        IValidator<ExchangeCodeRequest> exchangeCodeValidator,
        IValidator<RefreshTokenRequest> refreshTokenValidator)
    {
        _authService = authService;
        _auth = auth;
        _registerValidator = registerValidator;
        _loginValidator = loginValidator;
        _externalLoginValidator = externalLoginValidator;
        _exchangeCodeValidator = exchangeCodeValidator;
        _refreshTokenValidator = refreshTokenValidator;
    }

    [Function("AuthRegister")]
    public async Task<HttpResponseData> Register(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/register")] HttpRequestData req)
    {
        var request = await FunctionHelper.DeserializeAndValidateAsync<RegisterRequest>(req, _registerValidator);
        var result = await _authService.RegisterAsync(request);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, result);
    }

    [Function("AuthLogin")]
    public async Task<HttpResponseData> Login(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/login")] HttpRequestData req)
    {
        var request = await FunctionHelper.DeserializeAndValidateAsync<LoginRequest>(req, _loginValidator);
        var result = await _authService.LoginAsync(request);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, result);
    }

    [Function("AuthExternalLogin")]
    public async Task<HttpResponseData> ExternalLogin(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/external-login")] HttpRequestData req)
    {
        var request = await FunctionHelper.DeserializeAndValidateAsync<ExternalLoginRequest>(req, _externalLoginValidator);
        var result = await _authService.ExternalLoginAsync(request);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, result);
    }

    [Function("AuthExchangeCode")]
    public async Task<HttpResponseData> ExchangeCode(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/exchange-code")] HttpRequestData req)
    {
        var request = await FunctionHelper.DeserializeAndValidateAsync<ExchangeCodeRequest>(req, _exchangeCodeValidator);
        var result = await _authService.ExchangeCodeAsync(request);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, result);
    }

    [Function("AuthRefreshToken")]
    public async Task<HttpResponseData> RefreshToken(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/refresh-token")] HttpRequestData req)
    {
        var request = await FunctionHelper.DeserializeAndValidateAsync<RefreshTokenRequest>(req, _refreshTokenValidator);
        var result = await _authService.RefreshTokenAsync(request.RefreshToken);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, result);
    }

    [Function("AuthRevokeToken")]
    public async Task<HttpResponseData> RevokeToken(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/revoke-token")] HttpRequestData req)
    {
        var principal = await _auth.RequireAuthAsync(req);
        var userId = AuthHelper.GetUserId(principal);
        await _authService.RevokeTokenAsync(userId);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { message = "Token revoked." });
    }
}
