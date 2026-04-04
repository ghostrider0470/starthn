using AutoMapper;
using Api.DTOs.CaseStudies;
using Api.Entities;

namespace Api.Mapping;

public class CaseStudyMappingProfile : Profile
{
    public CaseStudyMappingProfile()
    {
        CreateMap<ArchitectureDecisionEntry, ArchitectureDecisionDto>();
        CreateMap<ResultEntry, ResultDto>();

        CreateMap<CaseStudyEntity, CaseStudyResponse>();
        CreateMap<CaseStudyEntity, AdminCaseStudyResponse>();
    }
}
