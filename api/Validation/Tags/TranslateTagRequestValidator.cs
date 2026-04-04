using Api.DTOs.Tags;
using FluentValidation;

namespace Api.Validation.Tags;

public class TranslateTagRequestValidator : AbstractValidator<TranslateTagRequest>
{
    public TranslateTagRequestValidator()
    {
        RuleFor(x => x.Targets).NotEmpty();
        RuleForEach(x => x.Targets).SetValidator(new TranslateTagTargetValidator());
    }
}

public class TranslateTagTargetValidator : AbstractValidator<TranslateTagTarget>
{
    public TranslateTagTargetValidator()
    {
        RuleFor(x => x.LocaleCode).NotEmpty().MaximumLength(10);
        RuleFor(x => x.TranslatorCode).NotEmpty().MaximumLength(10);
    }
}
