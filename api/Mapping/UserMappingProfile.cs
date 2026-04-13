using AutoMapper;
using Api.DTOs.Auth;
using Api.DTOs.Authors;
using Api.Entities;

namespace Api.Mapping;

public class UserMappingProfile : Profile
{
    public UserMappingProfile()
    {
        CreateMap<UserEntity, AdminUserResponse>();

        CreateMap<UserEntity, AuthorResponse>()
            .ForMember(dest => dest.Slug, opt => opt.MapFrom(src =>
                src.Slug ?? $"{src.FirstName}-{src.LastName}".ToLowerInvariant().Replace(" ", "-")))
            .ForMember(dest => dest.PostCount, opt => opt.Ignore());
    }
}
