using Api.DTOs.LlmProviders;
using FluentValidation;

namespace Api.Validation.LlmProviders;

public class CreateLlmProviderRequestValidator : AbstractValidator<CreateLlmProviderRequest>
{
    public CreateLlmProviderRequestValidator()
    {
        RuleFor(x => x.Key).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.BaseUrl).NotEmpty().MaximumLength(500);
        RuleFor(x => x.ApiKey).NotEmpty();
        RuleFor(x => x.Api).NotEmpty().MaximumLength(100);
        RuleForEach(x => x.Models).SetValidator(new LlmModelRequestValidator());
    }
}

public class LlmModelRequestValidator : AbstractValidator<LlmModelRequest>
{
    public LlmModelRequestValidator()
    {
        RuleFor(x => x.Id).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.MaxTokens).GreaterThan(0);
    }
}
