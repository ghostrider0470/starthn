using AutoMapper;
using Api.Entities;
using Api.DTOs.LlmProviders;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;

namespace Api.Services.Implementations;

// Trimmed to the read paths used by ChatService (GetChatActiveAsync) and
// LlmReviewService (GetActiveAsync) + settings. Provider/settings CRUD moved to
// the Cloudflare Worker (D1).
public class LlmProviderService : ILlmProviderService
{
    private readonly ILlmProviderRepository _providerRepo;
    private readonly ILlmSettingsRepository _settingsRepo;
    private readonly IMapper _mapper;

    public LlmProviderService(ILlmProviderRepository providerRepo, ILlmSettingsRepository settingsRepo, IMapper mapper)
    {
        _providerRepo = providerRepo;
        _settingsRepo = settingsRepo;
        _mapper = mapper;
    }

    public async Task<LlmSettingsResponse> GetSettingsAsync()
    {
        var doc = await _settingsRepo.GetAsync() ?? new LlmSettingsEntity();
        return _mapper.Map<LlmSettingsResponse>(doc);
    }

    // ── Internal: raw provider for LlmReviewService ───────────────────────────

    public async Task<(LlmProviderEntity? provider, LlmModelEntry? model)> GetActiveAsync()
    {
        var settings = await _settingsRepo.GetAsync();

        if (settings == null || !settings.IsEnabled
            || string.IsNullOrEmpty(settings.ActiveProviderKey)
            || string.IsNullOrEmpty(settings.ActiveModelId))
            return (null, null);

        var provider = await _providerRepo.GetByKeyEnabledAsync(settings.ActiveProviderKey);

        if (provider == null) return (null, null);

        var model = provider.Models.FirstOrDefault(m => m.Id == settings.ActiveModelId);
        return (provider, model);
    }

    // ── Internal: raw provider for ChatService ───────────────────────────────

    public async Task<(LlmProviderEntity? provider, LlmModelEntry? model)> GetChatActiveAsync()
    {
        var settings = await _settingsRepo.GetAsync();

        if (settings == null
            || string.IsNullOrEmpty(settings.ChatProviderKey)
            || string.IsNullOrEmpty(settings.ChatModelId))
            return (null, null);

        var provider = await _providerRepo.GetByKeyEnabledAsync(settings.ChatProviderKey);

        if (provider == null) return (null, null);

        var model = provider.Models.FirstOrDefault(m => m.Id == settings.ChatModelId);
        return (provider, model);
    }
}
