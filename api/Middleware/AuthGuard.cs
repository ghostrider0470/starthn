using System.Security.Claims;
using Api.Entities;
using Api.Services.Interfaces;
using Microsoft.Azure.Functions.Worker.Http;

namespace Api.Middleware;

internal static class AuthGuard
{
    internal static async Task<ClaimsPrincipal?> AuthenticateAsync(
        HttpRequestData req, IJwtService jwt, IApiKeyService apiKeyService)
    {
        var token = ExtractToken(req);
        if (token == null) return null;
        if (token.StartsWith("ht_"))
        {
            var user = await apiKeyService.ValidateKeyAsync(token);
            if (user == null) return null;
            return BuildPrincipalFromUser(user);
        }
        return jwt.ValidateAccessToken(token);
    }

    internal static string? GetUserId(ClaimsPrincipal principal)
    {
        return principal.FindFirst("nameid")?.Value;
    }

    internal static bool HasPermission(ClaimsPrincipal principal, IPermissionService permissionService, string permission)
    {
        var roles = principal.FindAll("role").Select(c => c.Value).ToList();
        return permissionService.HasPermissionAsync(roles, permission).GetAwaiter().GetResult();
    }

    internal static bool HasAnyPermission(ClaimsPrincipal principal, IPermissionService permissionService, params string[] permissions)
    {
        var roles = principal.FindAll("role").Select(c => c.Value).ToList();
        return permissionService.HasAnyPermissionAsync(roles, permissions).GetAwaiter().GetResult();
    }

    private static string? ExtractToken(HttpRequestData req)
    {
        var authHeader = req.Headers.TryGetValues("X-Authorization", out var values)
            ? values.FirstOrDefault()
            : null;
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return null;
        return authHeader["Bearer ".Length..].Trim();
    }

    private static ClaimsPrincipal BuildPrincipalFromUser(UserEntity user)
    {
        var claims = new List<Claim>
        {
            new("nameid", user.Id),
            new("email", user.Email),
            new("given_name", user.FirstName),
            new("family_name", user.LastName),
        };
        foreach (var role in user.Roles)
            claims.Add(new Claim("role", role));
        foreach (var permission in user.Permissions)
            claims.Add(new Claim("permission", permission));
        var identity = new ClaimsIdentity(claims, "ApiKey", "nameid", "role");
        return new ClaimsPrincipal(identity);
    }
}
