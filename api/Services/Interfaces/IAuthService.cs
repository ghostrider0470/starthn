using Api.DTOs.Auth;

namespace Api.Services.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<AuthResponse> ExternalLoginAsync(ExternalLoginRequest request);
    Task<ExchangeCodeResponse> ExchangeCodeAsync(ExchangeCodeRequest request);
    Task<AuthResponse> RefreshTokenAsync(string refreshToken);
    Task RevokeTokenAsync(string userId);
}
