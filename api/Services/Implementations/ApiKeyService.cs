using System.Security.Cryptography;
using System.Text;
using Api.DTOs.Auth;
using Api.Entities;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

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

        var update = Builders<UserEntity>.Update.Push(u => u.ApiKeys, entry);
        await _userRepo.UpdateAsync(userId, update);

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
        var update = Builders<UserEntity>.Update.PullFilter(
            u => u.ApiKeys, k => k.Id == keyId);
        var result = await _userRepo.FindOneAndUpdateAsync(userId, update);

        if (result != null)
        {
            _logger.LogInformation("API key {KeyId} revoked for user {UserId}", keyId, userId);
            return true;
        }

        return false;
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
        var updateLastUsed = Builders<UserEntity>.Update.Set("apiKeys.$.lastUsedAt", DateTime.UtcNow);
        var arrayFilter = Builders<UserEntity>.Filter.And(
            Builders<UserEntity>.Filter.Eq(u => u.Id, user.Id),
            Builders<UserEntity>.Filter.ElemMatch(u => u.ApiKeys, k => k.KeyHash == keyHash));
        // Fire-and-forget: we intentionally discard the task
        _ = _userRepo.UpdateAsync(user.Id, updateLastUsed);

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
