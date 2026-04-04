using Api.DTOs.Blog;
using FluentValidation;

namespace Api.Validation.Blog;

public class CreateBlogPostRequestValidator : AbstractValidator<CreateBlogPostRequest>
{
    public CreateBlogPostRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Excerpt).NotEmpty().MaximumLength(500);
        RuleFor(x => x.ReadTime).NotEmpty();
        RuleFor(x => x.Category).NotEmpty();
        RuleFor(x => x.Content).NotEmpty();
    }
}
