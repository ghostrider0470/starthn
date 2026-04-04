using Api.DTOs.Auth;
using FluentValidation;

namespace Api.Validation.Auth;

public class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileRequestValidator()
    {
        RuleFor(x => x.FirstName).MaximumLength(100).When(x => x.FirstName != null);
        RuleFor(x => x.LastName).MaximumLength(100).When(x => x.LastName != null);
        RuleFor(x => x.PhoneNumber).MaximumLength(20).When(x => x.PhoneNumber != null);
        RuleFor(x => x.Bio).MaximumLength(2000).When(x => x.Bio != null);
        RuleFor(x => x.Profession).MaximumLength(200).When(x => x.Profession != null);
        RuleFor(x => x.Slug).MaximumLength(100).When(x => x.Slug != null);
    }
}
