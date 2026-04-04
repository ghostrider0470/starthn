using System.Security.Claims;
using Api.Entities;

namespace Api.Services.Interfaces;

public interface IJwtService
{
    int RefreshTokenExpiryDays { get; }
    (string accessToken, string expiresAt) GenerateAccessToken(UserEntity user);
    string GenerateRefreshToken();
    ClaimsPrincipal? ValidateAccessToken(string token);
}
