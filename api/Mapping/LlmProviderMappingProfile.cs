using AutoMapper;
using Api.DTOs.LlmProviders;
using Api.Entities;

namespace Api.Mapping;

public class LlmProviderMappingProfile : Profile
{
    public LlmProviderMappingProfile()
    {
        CreateMap<LlmModelEntry, LlmModelResponse>();

        CreateMap<LlmProviderEntity, LlmProviderResponse>()
            .ForMember(dest => dest.ApiKeyMasked, opt => opt.MapFrom(src => MaskKey(src.ApiKey)));

        CreateMap<LlmSettingsEntity, LlmSettingsResponse>();
    }

    private static string MaskKey(string key)
    {
        if (string.IsNullOrEmpty(key)) return "";
        if (key.Length <= 8) return "••••••••";
        return key[..4] + new string('•', Math.Min(key.Length - 8, 20)) + key[^4..];
    }
}
