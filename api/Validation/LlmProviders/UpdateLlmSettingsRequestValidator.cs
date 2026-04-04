using Api.DTOs.LlmProviders;
using FluentValidation;

namespace Api.Validation.LlmProviders;

public class UpdateLlmSettingsRequestValidator : AbstractValidator<UpdateLlmSettingsRequest>
{
    public UpdateLlmSettingsRequestValidator()
    {
        RuleFor(x => x.ActiveProviderKey).MaximumLength(100).When(x => x.ActiveProviderKey != null);
        RuleFor(x => x.ActiveModelId).MaximumLength(200).When(x => x.ActiveModelId != null);
        RuleFor(x => x.Concurrency).GreaterThan(0).When(x => x.Concurrency.HasValue);
    }
}
