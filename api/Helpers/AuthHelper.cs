using System.Security.Claims;
using Api.Exceptions;
using Api.Middleware;
using Api.Services.Interfaces;
using Microsoft.Azure.Functions.Worker.Http;

namespace Api.Helpers;

public class AuthHelper
{
    private readonly IJwtService _jwtService;
    private readonly IApiKeyService _apiKeyService;
    private readonly IPermissionService _permissionService;

    public AuthHelper(IJwtService jwtService, IApiKeyService apiKeyService, IPermissionService permissionService)
    {
        _jwtService = jwtService;
        _apiKeyService = apiKeyService;
        _permissionService = permissionService;
    }

    /// <summary>Requires authentication. Throws UnauthorizedException if not authenticated.</summary>
    public async Task<ClaimsPrincipal> RequireAuthAsync(HttpRequestData req)
    {
        var principal = await AuthGuard.AuthenticateAsync(req, _jwtService, _apiKeyService);
        if (principal == null)
            throw new UnauthorizedException();
        return principal;
    }

    /// <summary>Requires authentication + specific permission. Throws ForbiddenException if missing.</summary>
    public async Task<ClaimsPrincipal> RequirePermissionAsync(HttpRequestData req, string permission)
    {
        var principal = await RequireAuthAsync(req);
        if (!AuthGuard.HasPermission(principal, _permissionService, permission))
            throw new ForbiddenException();
        return principal;
    }

    /// <summary>Requires authentication + any of the given permissions.</summary>
    public async Task<ClaimsPrincipal> RequireAnyPermissionAsync(HttpRequestData req, params string[] permissions)
    {
        var principal = await RequireAuthAsync(req);
        if (!AuthGuard.HasAnyPermission(principal, _permissionService, permissions))
            throw new ForbiddenException();
        return principal;
    }

    /// <summary>Optional authentication — returns null if not authenticated.</summary>
    public async Task<ClaimsPrincipal?> TryAuthAsync(HttpRequestData req)
    {
        return await AuthGuard.AuthenticateAsync(req, _jwtService, _apiKeyService);
    }

    /// <summary>Check if an already-authenticated principal has a specific permission.</summary>
    public bool HasPermission(ClaimsPrincipal principal, string permission) =>
        AuthGuard.HasPermission(principal, _permissionService, permission);

    public static string GetUserId(ClaimsPrincipal principal) =>
        AuthGuard.GetUserId(principal) ?? throw new UnauthorizedException("User ID not found in token.");
}
