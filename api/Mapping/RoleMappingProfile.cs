using AutoMapper;
using Api.DTOs.Roles;
using Api.Entities;

namespace Api.Mapping;

public class RoleMappingProfile : Profile
{
    public RoleMappingProfile()
    {
        CreateMap<RoleEntity, RoleResponse>();
        CreateMap<RoleEntity, PublicRoleResponse>();
    }
}
