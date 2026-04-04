using Api.DTOs.LlmProviders;
using Api.Entities;

namespace Api.Services.Interfaces;

public interface ILlmProviderService
{
    Task<List<LlmProviderResponse>> GetAllProvidersAsync();
    Task<LlmProviderResponse> CreateProviderAsync(CreateLlmProviderRequest request);
    Task<LlmProviderResponse?> UpdateProviderAsync(string key, UpdateLlmProviderRequest request);
    Task<bool> DeleteProviderAsync(string key);
    Task<LlmSettingsResponse> GetSettingsAsync();
    Task<LlmSettingsResponse> UpdateSettingsAsync(UpdateLlmSettingsRequest request);
    Task<(LlmProviderEntity? provider, LlmModelEntry? model)> GetActiveAsync();
    Task<(LlmProviderEntity? provider, LlmModelEntry? model)> GetChatActiveAsync();
}
