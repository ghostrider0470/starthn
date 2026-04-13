using Api.DTOs.Auth;
using FluentValidation;

namespace Api.Validation.Auth;

public class CreateApiKeyRequestValidator : AbstractValidator<CreateApiKeyRequest>
{
    public CreateApiKeyRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ExpiresInDays).GreaterThan(0).When(x => x.ExpiresInDays.HasValue);
    }
}
