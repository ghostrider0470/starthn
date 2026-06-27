using Api.DTOs.Blog;
using FluentValidation;

namespace Api.Validation.Blog;

public class TranslateBlogPostRequestValidator : AbstractValidator<TranslateBlogPostRequest>
{
    public TranslateBlogPostRequestValidator()
    {
        RuleFor(x => x.Targets).NotEmpty();
        RuleForEach(x => x.Targets).ChildRules(t =>
        {
            t.RuleFor(x => x.LocaleCode).NotEmpty();
            t.RuleFor(x => x.TranslatorCode).NotEmpty();
        });
    }
}
