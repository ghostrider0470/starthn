using Api.Entities;
using Api.Repositories.Interfaces;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
using System.Net;

namespace Api.Repositories.Implementations;

public class CaseStudyRepository : ICaseStudyRepository
{
    private readonly Container _container;

    public CaseStudyRepository(CosmosClient client)
    {
        _container = client.GetContainer("horizon", "caseStudies");
    }

    public async Task<List<CaseStudyEntity>> GetPublishedAsync()
    {
        var query = _container.GetItemLinqQueryable<CaseStudyEntity>()
            .Where(d => d.IsPublished)
            .OrderByDescending(d => d.CreatedAt);
        using var iterator = query.ToFeedIterator();
        var results = new List<CaseStudyEntity>();
        while (iterator.HasMoreResults)
            results.AddRange(await iterator.ReadNextAsync());
        return results;
    }

    public async Task<CaseStudyEntity?> GetBySlugAsync(string slug, bool publishedOnly = false)
    {
        try
        {
            var response = await _container.ReadItemAsync<CaseStudyEntity>(slug, new PartitionKey(slug));
            if (response.Resource.IsDeleted) return null;
            if (publishedOnly && !response.Resource.IsPublished) return null;
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<List<CaseStudyEntity>> GetAllAsync()
    {
        var query = _container.GetItemLinqQueryable<CaseStudyEntity>()
            .OrderByDescending(d => d.CreatedAt);
        using var iterator = query.ToFeedIterator();
        var results = new List<CaseStudyEntity>();
        while (iterator.HasMoreResults)
            results.AddRange(await iterator.ReadNextAsync());
        return results;
    }

    public async Task InsertAsync(CaseStudyEntity caseStudy)
    {
        caseStudy.Id = caseStudy.Slug;
        await _container.CreateItemAsync(caseStudy, new PartitionKey(caseStudy.Slug));
    }

    public async Task<CaseStudyEntity> ReplaceAsync(CaseStudyEntity entity)
    {
        entity.UpdatedAt = DateTime.UtcNow;
        var response = await _container.ReplaceItemAsync(
            entity, entity.Id, new PartitionKey(entity.Slug),
            new ItemRequestOptions { IfMatchEtag = entity.ETag });
        return response.Resource;
    }

    public async Task<bool> DeleteAsync(string slug)
    {
        try
        {
            var response = await _container.ReadItemAsync<CaseStudyEntity>(slug, new PartitionKey(slug));
            var entity = response.Resource;
            entity.IsDeleted = true;
            entity.Ttl = 86400;
            await _container.UpsertItemAsync(entity, new PartitionKey(slug));
            return true;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return false;
        }
    }
}
