using Api.DTOs.Tags;
using FluentValidation;

namespace Api.Validation.Tags;

public class UpdateTagRequestValidator : AbstractValidator<UpdateTagRequest>
{
    public UpdateTagRequestValidator()
    {
        RuleFor(x => x.Slug).MaximumLength(100).When(x => x.Slug != null);
        RuleFor(x => x.Label).MaximumLength(200).When(x => x.Label != null);
    }
}
