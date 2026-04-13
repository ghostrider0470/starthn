using Api.DTOs.Categories;
using FluentValidation;

namespace Api.Validation.Categories;

public class UpdateCategoryRequestValidator : AbstractValidator<UpdateCategoryRequest>
{
    public UpdateCategoryRequestValidator()
    {
        RuleFor(x => x.Slug).MaximumLength(100).When(x => x.Slug != null);
        RuleFor(x => x.Label).MaximumLength(200).When(x => x.Label != null);
    }
}
