using Api.Entities;

namespace Api.Repositories.Interfaces;

public interface ICaseStudyRepository
{
    Task<List<CaseStudyEntity>> GetPublishedAsync();
    Task<CaseStudyEntity?> GetBySlugAsync(string slug, bool publishedOnly = false);
    Task<List<CaseStudyEntity>> GetAllAsync();
    Task InsertAsync(CaseStudyEntity caseStudy);
    Task<CaseStudyEntity> ReplaceAsync(CaseStudyEntity entity);
    Task<bool> DeleteAsync(string slug);
}
