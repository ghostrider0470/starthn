using AutoMapper;
using Api.DTOs.Blog;
using Api.Entities;

namespace Api.Mapping;

public class BlogMappingProfile : Profile
{
    public BlogMappingProfile()
    {
        CreateMap<BlogPostEntity, BlogPostResponse>()
            .ForMember(dest => dest.ReadTime, opt => opt.MapFrom(src =>
                src.ReadTime.HasValue ? $"{src.ReadTime} min read" : string.Empty))
            .ForMember(dest => dest.PublishedAt, opt => opt.MapFrom(src =>
                src.PublishedAt.HasValue ? src.PublishedAt.Value.ToString("yyyy-MM-dd") : string.Empty))
            .ForMember(dest => dest.Content, opt => opt.ConvertUsing(ContentConverter.Instance, src => src.Content))
            .ForMember(dest => dest.AuthorSlug, opt => opt.Ignore())
            .ForMember(dest => dest.AuthorAvatarUrl, opt => opt.Ignore());

        CreateMap<BlogPostEntity, AdminBlogPostResponse>()
            .ForMember(dest => dest.ReadTime, opt => opt.MapFrom(src =>
                src.ReadTime.HasValue ? $"{src.ReadTime} min read" : string.Empty))
            .ForMember(dest => dest.PublishedAt, opt => opt.MapFrom(src =>
                src.PublishedAt.HasValue ? src.PublishedAt.Value.ToString("yyyy-MM-dd") : string.Empty))
            .ForMember(dest => dest.Content, opt => opt.ConvertUsing(ContentConverter.Instance, src => src.Content))
            .ForMember(dest => dest.AuthorSlug, opt => opt.Ignore())
            .ForMember(dest => dest.AuthorAvatarUrl, opt => opt.Ignore());
    }
}

internal class ContentConverter : IValueConverter<List<object>?, List<string>>
{
    public static readonly ContentConverter Instance = new();

    public List<string> Convert(List<object>? sourceMember, ResolutionContext context)
        => sourceMember?.Select(c => c?.ToString() ?? "").ToList() ?? [];
}
