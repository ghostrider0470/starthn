using Api.Entities;
using Api.Repositories.Interfaces;
using MongoDB.Driver;

namespace Api.Repositories.Implementations;

public class CaseStudyRepository : ICaseStudyRepository
{
    private readonly IMongoCollection<CaseStudyEntity> _collection;

    public CaseStudyRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<CaseStudyEntity>("caseStudies");
    }

    public async Task<List<CaseStudyEntity>> GetPublishedAsync() =>
        await _collection
            .Find(d => d.IsPublished)
            .SortByDescending(d => d.CreatedAt)
            .ToListAsync();

    public async Task<CaseStudyEntity?> GetBySlugAsync(string slug, bool publishedOnly = false)
    {
        var filter = publishedOnly
            ? Builders<CaseStudyEntity>.Filter.And(
                Builders<CaseStudyEntity>.Filter.Eq(d => d.Slug, slug),
                Builders<CaseStudyEntity>.Filter.Eq(d => d.IsPublished, true))
            : Builders<CaseStudyEntity>.Filter.Eq(d => d.Slug, slug);

        return await _collection.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<List<CaseStudyEntity>> GetAllAsync() =>
        await _collection
            .Find(FilterDefinition<CaseStudyEntity>.Empty)
            .SortByDescending(d => d.CreatedAt)
            .ToListAsync();

    public async Task InsertAsync(CaseStudyEntity caseStudy) =>
        await _collection.InsertOneAsync(caseStudy);

    public async Task<CaseStudyEntity?> FindOneAndUpdateAsync(
        string slug, UpdateDefinition<CaseStudyEntity> update) =>
        await _collection.FindOneAndUpdateAsync<CaseStudyEntity>(
            d => d.Slug == slug,
            update,
            new FindOneAndUpdateOptions<CaseStudyEntity, CaseStudyEntity> { ReturnDocument = ReturnDocument.After });

    public async Task<bool> DeleteAsync(string slug)
    {
        var result = await _collection.DeleteOneAsync(d => d.Slug == slug);
        return result.DeletedCount > 0;
    }
}
