using Api.DTOs.CaseStudies;

namespace Api.Services.Interfaces;

public interface ICaseStudyService
{
    Task<List<CaseStudyResponse>> GetPublishedAsync();
    Task<CaseStudyResponse?> GetBySlugAsync(string slug);
    Task<List<AdminCaseStudyResponse>> GetAllAsync();
    Task<AdminCaseStudyResponse> CreateAsync(CreateCaseStudyRequest request);
    Task<AdminCaseStudyResponse?> UpdateAsync(string slug, UpdateCaseStudyRequest request);
    Task<bool> DeleteAsync(string slug);
    Task<int> SeedAsync(List<CreateCaseStudyRequest> items);
}
