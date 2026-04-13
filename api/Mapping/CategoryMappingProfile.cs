using AutoMapper;
using Api.DTOs.Categories;
using Api.Entities;

namespace Api.Mapping;

public class CategoryMappingProfile : Profile
{
    public CategoryMappingProfile()
    {
        CreateMap<CategoryEntity, CategoryResponse>();
    }
}
