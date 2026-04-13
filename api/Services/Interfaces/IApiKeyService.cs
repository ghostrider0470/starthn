using Api.DTOs.Auth;
using Api.Entities;

namespace Api.Services.Interfaces;

public interface IApiKeyService
{
    Task<CreateApiKeyResponse> CreateAsync(string userId, CreateApiKeyRequest request);
    Task<List<ApiKeyResponse>> ListAsync(string userId);
    Task<bool> DeleteAsync(string userId, string keyId);
    Task<UserEntity?> ValidateKeyAsync(string rawKey);
}
