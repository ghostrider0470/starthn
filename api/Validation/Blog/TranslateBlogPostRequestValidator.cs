using Api.DTOs.Blog;
using FluentValidation;

namespace Api.Validation.Blog;

public class TranslateBlogPostRequestValidator : AbstractValidator<TranslateBlogPostRequest>
{
    public TranslateBlogPostRequestValidator()
    {
        RuleFor(x => x.Languages).NotEmpty();
    }
}
