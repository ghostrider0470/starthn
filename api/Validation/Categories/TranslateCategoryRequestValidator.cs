using Api.DTOs.Categories;
using FluentValidation;

namespace Api.Validation.Categories;

public class TranslateCategoryRequestValidator : AbstractValidator<TranslateCategoryRequest>
{
    public TranslateCategoryRequestValidator()
    {
        RuleFor(x => x.Targets).NotEmpty();
        RuleForEach(x => x.Targets).SetValidator(new TranslateCategoryTargetValidator());
    }
}

public class TranslateCategoryTargetValidator : AbstractValidator<TranslateCategoryTarget>
{
    public TranslateCategoryTargetValidator()
    {
        RuleFor(x => x.LocaleCode).NotEmpty().MaximumLength(10);
        RuleFor(x => x.TranslatorCode).NotEmpty().MaximumLength(10);
    }
}
