using AutoMapper;
using Api.DTOs.Blog;
using Api.Entities;

namespace Api.Mapping;

public class BlogMappingProfile : Profile
{
    public BlogMappingProfile()
    {
        CreateMap<BlogPostEntity, BlogPostResponse>()
            .ForMember(dest => dest.AuthorSlug, opt => opt.Ignore())
            .ForMember(dest => dest.AuthorAvatarUrl, opt => opt.Ignore());

        CreateMap<BlogPostEntity, AdminBlogPostResponse>()
            .ForMember(dest => dest.AuthorSlug, opt => opt.Ignore())
            .ForMember(dest => dest.AuthorAvatarUrl, opt => opt.Ignore());
    }
}
