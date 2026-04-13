using AutoMapper;
using Api.DTOs.Tags;
using Api.Entities;

namespace Api.Mapping;

public class TagMappingProfile : Profile
{
    public TagMappingProfile()
    {
        CreateMap<TagEntity, TagResponse>();
    }
}
