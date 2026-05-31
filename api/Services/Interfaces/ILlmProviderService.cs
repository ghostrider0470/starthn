using Api.DTOs.LlmProviders;
using Api.Entities;

namespace Api.Services.Interfaces;

public interface ILlmProviderService
{
    Task<LlmSettingsResponse> GetSettingsAsync();
    Task<(LlmProviderEntity? provider, LlmModelEntry? model)> GetActiveAsync();
    Task<(LlmProviderEntity? provider, LlmModelEntry? model)> GetChatActiveAsync();
}
