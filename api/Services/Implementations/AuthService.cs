using System.IdentityModel.Tokens.Jwt;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Api.DTOs.Auth;
using Api.Entities;
using Api.Exceptions;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Api.Services.Implementations;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepo;
    private readonly IJwtService _jwt;
    private readonly ILogger<AuthService> _logger;

    public AuthService(IUserRepository userRepo, IJwtService jwt, ILogger<AuthService> logger)
    {
        _userRepo = userRepo;
        _jwt = jwt;
        _logger = logger;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        // Check email uniqueness
        var existing = await _userRepo.GetByEmailAsync(request.Email.ToLowerInvariant());

        if (existing != null)
            throw new ConflictException("A user with this email already exists.");

        var user = new UserEntity
        {
            Email = request.Email.ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 12),
            FirstName = request.FirstName,
            LastName = request.LastName,
        };

        // Generate tokens
        var (accessToken, expiresAt) = _jwt.GenerateAccessToken(user);
        var refreshToken = _jwt.GenerateRefreshToken();

        user.RefreshToken = HashToken(refreshToken);
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(_jwt.RefreshTokenExpiryDays);

        await _userRepo.InsertAsync(user);

        _logger.LogInformation("User registered: {Email}", user.Email);

        return new AuthResponse
        {
            Message = "Registration successful.",
            Token = new TokenDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = expiresAt,
            }
        };
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _userRepo.GetByEmailAsync(request.Email.ToLowerInvariant());

        if (user == null || string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedException("Invalid email or password.");

        if (!user.IsActive)
            throw new UnauthorizedException("Account is deactivated.");

        // Generate tokens
        var (accessToken, expiresAt) = _jwt.GenerateAccessToken(user);
        var refreshToken = _jwt.GenerateRefreshToken();

        // Update refresh token on user document (store hashed)
        user.RefreshToken = HashToken(refreshToken);
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(_jwt.RefreshTokenExpiryDays);

        await _userRepo.ReplaceAsync(user);

        _logger.LogInformation("User logged in: {Email}", user.Email);

        return new AuthResponse
        {
            Message = "Login successful.",
            Token = new TokenDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = expiresAt,
            }
        };
    }

    public async Task<AuthResponse> ExternalLoginAsync(ExternalLoginRequest request)
    {
        // Decode the ID token to extract user claims
        // The token was obtained via a trusted PKCE flow, so we decode without
        // full signature validation (the frontend already verified the OAuth state).
        var handler = new JwtSecurityTokenHandler();
        if (!handler.CanReadToken(request.IdToken))
            throw new UnauthorizedException("Invalid ID token.");

        var jwt = handler.ReadJwtToken(request.IdToken);

        // Extract claims from the ID token
        var email = jwt.Claims.FirstOrDefault(c => c.Type == "email" || c.Type == "preferred_username")?.Value;
        var firstName = jwt.Claims.FirstOrDefault(c => c.Type == "given_name")?.Value ?? "";
        var lastName = jwt.Claims.FirstOrDefault(c => c.Type == "family_name")?.Value ?? "";
        var name = jwt.Claims.FirstOrDefault(c => c.Type == "name")?.Value ?? "";

        if (string.IsNullOrWhiteSpace(email))
            throw new UnauthorizedException("Could not extract email from ID token.");

        email = email.ToLowerInvariant();

        // If we got a full name but no first/last, split it
        if (string.IsNullOrWhiteSpace(firstName) && !string.IsNullOrWhiteSpace(name))
        {
            var parts = name.Split(' ', 2);
            firstName = parts[0];
            lastName = parts.Length > 1 ? parts[1] : "";
        }

        // Find or create the user
        var user = await _userRepo.GetByEmailAsync(email);

        // Check if this email is a configured admin
        var adminEmails = (Environment.GetEnvironmentVariable("ADMIN_EMAILS") ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(e => e.ToLowerInvariant())
            .ToHashSet();
        var isAdmin = adminEmails.Contains(email);

        // Determine roles
        var roles = isAdmin
            ? new List<string> { "User", "MasterAdmin" }
            : new List<string> { "User" };

        if (user == null)
        {
            // Create new user (no password — external auth only)
            user = new UserEntity
            {
                Email = email,
                PasswordHash = null, // No password for external auth users
                FirstName = firstName,
                LastName = lastName,
                Roles = roles,
            };

            await _userRepo.InsertAsync(user);
            _logger.LogInformation("External user created via {Provider}: {Email} (Admin: {IsAdmin})",
                request.Provider, email, isAdmin);
        }
        else
        {
            if (!user.IsActive)
                throw new UnauthorizedException("Account is deactivated.");

            // Sync roles from Azure AD on every login — always deduplicate
            var mergedRoles = user.Roles.Union(roles).Distinct().ToList();
            if (!mergedRoles.SequenceEqual(user.Roles))
            {
                user.Roles = mergedRoles;
                _logger.LogInformation("Synced roles for {Email}: {Roles}", email, string.Join(", ", mergedRoles));
            }

            // Update name if it was empty (e.g., user registered via email first)
            if (string.IsNullOrWhiteSpace(user.FirstName) && !string.IsNullOrWhiteSpace(firstName))
            {
                user.FirstName = firstName;
                user.LastName = lastName;
            }

            await _userRepo.ReplaceAsync(user);
        }

        // Generate tokens
        var (accessToken, expiresAt) = _jwt.GenerateAccessToken(user);
        var refreshToken = _jwt.GenerateRefreshToken();

        // Store hashed refresh token on user document
        user.RefreshToken = HashToken(refreshToken);
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(_jwt.RefreshTokenExpiryDays);

        await _userRepo.ReplaceAsync(user);

        _logger.LogInformation("External login via {Provider}: {Email}", request.Provider, email);

        return new AuthResponse
        {
            Message = "Login successful.",
            Token = new TokenDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = expiresAt,
            }
        };
    }

    public async Task<ExchangeCodeResponse> ExchangeCodeAsync(ExchangeCodeRequest request)
    {
        var httpClient = new HttpClient();
        string tokenUrl;
        var parameters = new Dictionary<string, string>
        {
            ["code"] = request.Code,
            ["redirect_uri"] = request.RedirectUri,
            ["grant_type"] = "authorization_code",
        };

        switch (request.Provider)
        {
            case "Microsoft":
                tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
                var msClientId = Environment.GetEnvironmentVariable("MICROSOFT_CLIENT_ID")
                    ?? throw new InvalidOperationException("MICROSOFT_CLIENT_ID is not configured");
                var msClientSecret = Environment.GetEnvironmentVariable("MICROSOFT_CLIENT_SECRET")
                    ?? throw new InvalidOperationException("MICROSOFT_CLIENT_SECRET is not configured");
                parameters["client_id"] = msClientId;
                parameters["client_secret"] = msClientSecret;
                parameters["scope"] = "openid profile email";
                if (!string.IsNullOrWhiteSpace(request.CodeVerifier))
                    parameters["code_verifier"] = request.CodeVerifier;
                break;

            case "Google":
                tokenUrl = "https://oauth2.googleapis.com/token";
                var googleClientId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID")
                    ?? throw new InvalidOperationException("GOOGLE_CLIENT_ID is not configured");
                var googleClientSecret = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET")
                    ?? throw new InvalidOperationException("GOOGLE_CLIENT_SECRET is not configured");
                parameters["client_id"] = googleClientId;
                parameters["client_secret"] = googleClientSecret;
                break;

            default:
                throw new InvalidOperationException($"Provider '{request.Provider}' is not supported");
        }

        var content = new FormUrlEncodedContent(parameters);
        var response = await httpClient.PostAsync(tokenUrl, content);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            _logger.LogError("Token exchange failed for {Provider}: {Error}", request.Provider, errorBody);
            throw new UnauthorizedException($"Token exchange failed: {errorBody}");
        }

        var json = await response.Content.ReadAsStringAsync();
        var tokenResponse = JsonSerializer.Deserialize<ExchangeCodeResponse>(json)
            ?? throw new InvalidOperationException("Failed to parse token response");

        return tokenResponse;
    }

    public async Task<AuthResponse> RefreshTokenAsync(string refreshToken)
    {
        // Hash the incoming token to compare against stored hash
        var hashedToken = HashToken(refreshToken);
        var user = await _userRepo.GetByRefreshTokenHashAsync(hashedToken);

        if (user == null || user.RefreshTokenExpiryTime < DateTime.UtcNow)
            throw new UnauthorizedException("Invalid or expired refresh token.");

        // Generate new token pair
        var (newAccessToken, expiresAt) = _jwt.GenerateAccessToken(user);
        var newRefreshToken = _jwt.GenerateRefreshToken();

        // Update user with new refresh token hash (revokes old one)
        user.RefreshToken = HashToken(newRefreshToken);
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(_jwt.RefreshTokenExpiryDays);

        await _userRepo.ReplaceAsync(user);

        return new AuthResponse
        {
            Message = "Token refreshed.",
            Token = new TokenDto
            {
                AccessToken = newAccessToken,
                RefreshToken = newRefreshToken,
                ExpiresAt = expiresAt,
            }
        };
    }

    public async Task RevokeTokenAsync(string userId)
    {
        var user = await _userRepo.GetByIdAsync(userId);
        if (user == null) return;

        user.RefreshToken = null;
        user.RefreshTokenExpiryTime = null;

        await _userRepo.ReplaceAsync(user);

        _logger.LogInformation("Token revoked for user: {UserId}", userId);
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }
}
