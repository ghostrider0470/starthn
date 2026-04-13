using AutoMapper;
using Api.Entities;
using Api.DTOs.LlmProviders;
using Api.Exceptions;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using Microsoft.Azure.Cosmos;

namespace Api.Services.Implementations;

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

    // ── Providers ─────────────────────────────────────────────────────────────

    public async Task<List<LlmProviderResponse>> GetAllProvidersAsync()
    {
        var providers = await _providerRepo.GetAllAsync();
        return _mapper.Map<List<LlmProviderResponse>>(providers);
    }

    public async Task<LlmProviderResponse> CreateProviderAsync(CreateLlmProviderRequest request)
    {
        var doc = new LlmProviderEntity
        {
            Key = request.Key,
            Name = request.Name,
            BaseUrl = request.BaseUrl.TrimEnd('/'),
            ApiKey = request.ApiKey,
            Api = request.Api,
            Headers = request.Headers,
            IsEnabled = request.IsEnabled,
            Models = request.Models.Select(m => new LlmModelEntry
            {
                Id = m.Id,
                Name = m.Name,
                Api = m.Api,
                MaxTokens = m.MaxTokens,
            }).ToList(),
        };

        try
        {
            await _providerRepo.InsertAsync(doc);
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Conflict)
        {
            throw new ConflictException("A provider with this key already exists.");
        }
        return _mapper.Map<LlmProviderResponse>(doc);
    }

    public async Task<LlmProviderResponse?> UpdateProviderAsync(string key, UpdateLlmProviderRequest request)
    {
        var existing = await _providerRepo.GetByKeyAsync(key);
        if (existing == null) return null;

        if (request.Name != null) existing.Name = request.Name;
        if (request.BaseUrl != null) existing.BaseUrl = request.BaseUrl.TrimEnd('/');
        if (request.ApiKey != null) existing.ApiKey = request.ApiKey;
        if (request.Api != null) existing.Api = request.Api;
        if (request.Headers != null) existing.Headers = request.Headers;
        if (request.IsEnabled.HasValue) existing.IsEnabled = request.IsEnabled.Value;
        if (request.Models != null)
        {
            existing.Models = request.Models.Select(m => new LlmModelEntry
            {
                Id = m.Id,
                Name = m.Name,
                Api = m.Api,
                MaxTokens = m.MaxTokens,
            }).ToList();
        }

        var updated = await _providerRepo.ReplaceAsync(existing);

        return _mapper.Map<LlmProviderResponse>(updated);
    }

    public async Task<bool> DeleteProviderAsync(string key)
    {
        return await _providerRepo.DeleteAsync(key);
    }

    // ── Settings ──────────────────────────────────────────────────────────────

    public async Task<LlmSettingsResponse> GetSettingsAsync()
    {
        var doc = await _settingsRepo.GetAsync() ?? new LlmSettingsEntity();
        return _mapper.Map<LlmSettingsResponse>(doc);
    }

    public async Task<LlmSettingsResponse> UpdateSettingsAsync(UpdateLlmSettingsRequest request)
    {
        var existing = await _settingsRepo.GetAsync() ?? new LlmSettingsEntity();

        if (request.IsEnabled.HasValue) existing.IsEnabled = request.IsEnabled.Value;
        if (request.ActiveProviderKey != null) existing.ActiveProviderKey = request.ActiveProviderKey;
        if (request.ActiveModelId != null) existing.ActiveModelId = request.ActiveModelId;
        if (request.Concurrency.HasValue) existing.Concurrency = Math.Clamp(request.Concurrency.Value, 1, 20);

        await _settingsRepo.UpsertAsync(existing);

        return _mapper.Map<LlmSettingsResponse>(existing);
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
