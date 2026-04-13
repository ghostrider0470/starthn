using Api.DTOs.Auth;
using FluentValidation;

namespace Api.Validation.Auth;

public class UpdateUserRolesRequestValidator : AbstractValidator<UpdateUserRolesRequest>
{
    public UpdateUserRolesRequestValidator()
    {
        RuleFor(x => x.Roles).NotNull();
    }
}
