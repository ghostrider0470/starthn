using Api.Entities;
using MongoDB.Driver;

namespace Api.Repositories.Interfaces;

public interface ICaseStudyRepository
{
    Task<List<CaseStudyEntity>> GetPublishedAsync();
    Task<CaseStudyEntity?> GetBySlugAsync(string slug, bool publishedOnly = false);
    Task<List<CaseStudyEntity>> GetAllAsync();
    Task InsertAsync(CaseStudyEntity caseStudy);
    Task<CaseStudyEntity?> FindOneAndUpdateAsync(string slug, UpdateDefinition<CaseStudyEntity> update);
    Task<bool> DeleteAsync(string slug);
}
