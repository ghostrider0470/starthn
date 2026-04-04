using Api.DTOs.Blog;
using FluentValidation;

namespace Api.Validation.Blog;

public class UpdateTranslationRequestValidator : AbstractValidator<UpdateTranslationRequest>
{
    public UpdateTranslationRequestValidator()
    {
        RuleFor(x => x.Title).MaximumLength(200).When(x => x.Title != null);
        RuleFor(x => x.Excerpt).MaximumLength(500).When(x => x.Excerpt != null);
    }
}
