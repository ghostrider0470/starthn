using Api.DTOs.CaseStudies;
using FluentValidation;

namespace Api.Validation.CaseStudies;

public class CreateCaseStudyRequestValidator : AbstractValidator<CreateCaseStudyRequest>
{
    public CreateCaseStudyRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Client).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Industry).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.ExecutiveSummary).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.Challenge).NotEmpty();
        RuleFor(x => x.Solution).NotEmpty();
        RuleForEach(x => x.ArchitectureDecisions).SetValidator(new ArchitectureDecisionDtoValidator());
        RuleForEach(x => x.Results).SetValidator(new ResultDtoValidator());
    }
}

public class ArchitectureDecisionDtoValidator : AbstractValidator<ArchitectureDecisionDto>
{
    public ArchitectureDecisionDtoValidator()
    {
        RuleFor(x => x.Decision).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Rationale).NotEmpty().MaximumLength(1000);
    }
}

public class ResultDtoValidator : AbstractValidator<ResultDto>
{
    public ResultDtoValidator()
    {
        RuleFor(x => x.Metric).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Value).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(500);
    }
}
