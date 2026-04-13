using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Api.Entities;
using Api.Services.Interfaces;
using Microsoft.IdentityModel.Tokens;

namespace Api.Services.Implementations;

public class JwtService : IJwtService
{
    private readonly string _secret;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _accessTokenExpiryMinutes;
    private readonly int _refreshTokenExpiryDays;

    public JwtService()
    {
        _secret = Environment.GetEnvironmentVariable("JWT_SECRET")
            ?? throw new InvalidOperationException("JWT_SECRET is not configured");
        _issuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "horizon-tech";
        _audience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "horizon-frontend";
        _accessTokenExpiryMinutes = int.TryParse(
            Environment.GetEnvironmentVariable("JWT_ACCESS_TOKEN_EXPIRY_MINUTES"), out var m) ? m : 60;
        _refreshTokenExpiryDays = int.TryParse(
            Environment.GetEnvironmentVariable("JWT_REFRESH_TOKEN_EXPIRY_DAYS"), out var d) ? d : 7;
    }

    public int RefreshTokenExpiryDays => _refreshTokenExpiryDays;

    public (string accessToken, string expiresAt) GenerateAccessToken(UserEntity user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expires = DateTime.UtcNow.AddMinutes(_accessTokenExpiryMinutes);

        // Use short claim names that match frontend expectations
        var claims = new List<Claim>
        {
            new("nameid", user.Id),
            new("email", user.Email),
            new("given_name", user.FirstName),
            new("family_name", user.LastName),
        };

        // Add roles as individual claims
        foreach (var role in user.Roles)
        {
            claims.Add(new Claim("role", role));
        }

        // Add permissions as individual claims
        foreach (var permission in user.Permissions)
        {
            claims.Add(new Claim("permission", permission));
        }

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: expires,
            signingCredentials: credentials
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        return (tokenString, expires.ToString("O"));
    }

    public string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    public ClaimsPrincipal? ValidateAccessToken(string token)
    {
        try
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
            var handler = new JwtSecurityTokenHandler();

            var parameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = _issuer,
                ValidateAudience = true,
                ValidAudience = _audience,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ClockSkew = TimeSpan.FromMinutes(1),
                // Keep short claim names
                NameClaimType = "nameid",
                RoleClaimType = "role",
            };

            return handler.ValidateToken(token, parameters, out _);
        }
        catch
        {
            return null;
        }
    }
}
