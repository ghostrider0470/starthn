using Api.DTOs.LlmProviders;
using FluentValidation;

namespace Api.Validation.LlmProviders;

public class UpdateLlmProviderRequestValidator : AbstractValidator<UpdateLlmProviderRequest>
{
    public UpdateLlmProviderRequestValidator()
    {
        RuleFor(x => x.Name).MaximumLength(200).When(x => x.Name != null);
        RuleFor(x => x.BaseUrl).MaximumLength(500).When(x => x.BaseUrl != null);
        RuleFor(x => x.Api).MaximumLength(100).When(x => x.Api != null);
        RuleForEach(x => x.Models).SetValidator(new LlmModelRequestValidator());
    }
}
