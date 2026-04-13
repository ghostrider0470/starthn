using Api.DTOs.CaseStudies;
using FluentValidation;

namespace Api.Validation.CaseStudies;

public class UpdateCaseStudyRequestValidator : AbstractValidator<UpdateCaseStudyRequest>
{
    public UpdateCaseStudyRequestValidator()
    {
        RuleFor(x => x.Title).MaximumLength(200).When(x => x.Title != null);
        RuleFor(x => x.Client).MaximumLength(200).When(x => x.Client != null);
        RuleFor(x => x.Industry).MaximumLength(100).When(x => x.Industry != null);
        RuleFor(x => x.Description).MaximumLength(2000).When(x => x.Description != null);
        RuleFor(x => x.ExecutiveSummary).MaximumLength(2000).When(x => x.ExecutiveSummary != null);
        RuleForEach(x => x.ArchitectureDecisions).SetValidator(new ArchitectureDecisionDtoValidator());
        RuleForEach(x => x.Results).SetValidator(new ResultDtoValidator());
    }
}
