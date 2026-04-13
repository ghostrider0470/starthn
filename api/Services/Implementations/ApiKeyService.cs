using System.Security.Cryptography;
using System.Text;
using Api.DTOs.Auth;
using Api.Entities;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Api.Services.Implementations;

public class ApiKeyService : IApiKeyService
{
    private readonly IUserRepository _userRepo;
    private readonly ILogger<ApiKeyService> _logger;

    public ApiKeyService(IUserRepository userRepo, ILogger<ApiKeyService> logger)
    {
        _userRepo = userRepo;
        _logger = logger;
    }

    public async Task<CreateApiKeyResponse> CreateAsync(string userId, CreateApiKeyRequest request)
    {
        var rawKey = GenerateRawKey();
        var keyHash = HashKey(rawKey);

        var entry = new ApiKeyEntry
        {
            Name = request.Name,
            KeyHash = keyHash,
            KeyPrefix = rawKey[..8],
            KeySuffix = rawKey[^4..],
            ExpiresAt = request.ExpiresInDays.HasValue
                ? DateTime.UtcNow.AddDays(request.ExpiresInDays.Value)
                : null,
        };

        var user = await _userRepo.GetByIdAsync(userId);
        if (user == null) throw new InvalidOperationException("User not found.");

        user.ApiKeys.Add(entry);
        await _userRepo.ReplaceAsync(user);

        _logger.LogInformation("API key created for user {UserId}: {KeyName}", userId, request.Name);

        return new CreateApiKeyResponse
        {
            Id = entry.Id,
            Name = entry.Name,
            Key = rawKey,
            ExpiresAt = entry.ExpiresAt,
            CreatedAt = entry.CreatedAt,
        };
    }

    public async Task<List<ApiKeyResponse>> ListAsync(string userId)
    {
        var user = await _userRepo.GetByIdAsync(userId);
        if (user == null) return [];

        return user.ApiKeys.Select(k => new ApiKeyResponse
        {
            Id = k.Id,
            Name = k.Name,
            KeyMasked = $"{k.KeyPrefix}{"".PadRight(4, '\u2022')}{k.KeySuffix}",
            ExpiresAt = k.ExpiresAt,
            LastUsedAt = k.LastUsedAt,
            CreatedAt = k.CreatedAt,
        }).ToList();
    }

    public async Task<bool> DeleteAsync(string userId, string keyId)
    {
        var user = await _userRepo.GetByIdAsync(userId);
        if (user == null) return false;

        var removed = user.ApiKeys.RemoveAll(k => k.Id == keyId) > 0;
        if (!removed) return false;

        await _userRepo.ReplaceAsync(user);
        _logger.LogInformation("API key {KeyId} revoked for user {UserId}", keyId, userId);
        return true;
    }

    public async Task<UserEntity?> ValidateKeyAsync(string rawKey)
    {
        var keyHash = HashKey(rawKey);

        var user = await _userRepo.FindByApiKeyHashAsync(keyHash);
        if (user == null) return null;

        var entry = user.ApiKeys.FirstOrDefault(k => k.KeyHash == keyHash);
        if (entry == null) return null;

        // Check expiry
        if (entry.ExpiresAt.HasValue && entry.ExpiresAt.Value < DateTime.UtcNow)
            return null;

        // Update lastUsedAt (fire-and-forget)
        _ = Task.Run(async () =>
        {
            try
            {
                var freshUser = await _userRepo.GetByIdAsync(user.Id);
                if (freshUser == null) return;
                var freshEntry = freshUser.ApiKeys.FirstOrDefault(k => k.KeyHash == keyHash);
                if (freshEntry != null) freshEntry.LastUsedAt = DateTime.UtcNow;
                await _userRepo.ReplaceAsync(freshUser);
            }
            catch
            {
                // Fire-and-forget — ignore errors
            }
        });

        return user;
    }

    private static string GenerateRawKey()
    {
        var bytes = new byte[48];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return "ht_" + Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');
    }

    private static string HashKey(string rawKey)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawKey));
        return Convert.ToBase64String(bytes);
    }
}
