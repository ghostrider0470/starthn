using Api.DTOs.Auth;
using FluentValidation;

namespace Api.Validation.Auth;

public class ExchangeCodeRequestValidator : AbstractValidator<ExchangeCodeRequest>
{
    public ExchangeCodeRequestValidator()
    {
        RuleFor(x => x.Code).NotEmpty();
        RuleFor(x => x.Provider).NotEmpty();
        RuleFor(x => x.RedirectUri).NotEmpty();
    }
}
