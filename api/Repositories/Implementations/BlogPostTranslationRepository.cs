using Api.Entities;
using Api.Repositories.Interfaces;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
using System.Net;

namespace Api.Repositories.Implementations;

public class BlogPostTranslationRepository : IBlogPostTranslationRepository
{
    private readonly Container _container;

    public BlogPostTranslationRepository(CosmosClient client)
    {
        _container = client.GetContainer("horizon", "blogPostTranslations");
    }

    public async Task<BlogPostTranslationEntity?> GetAsync(string postSlug, string lang)
    {
        try
        {
            var response = await _container.ReadItemAsync<BlogPostTranslationEntity>(
                $"{postSlug}:{lang}", new PartitionKey(postSlug));
            if (response.Resource.IsDeleted) return null;
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<List<BlogPostTranslationEntity>> GetAllForPostAsync(string postSlug)
    {
        var query = _container.GetItemLinqQueryable<BlogPostTranslationEntity>(
            requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(postSlug) });
        using var iterator = query.ToFeedIterator();
        var results = new List<BlogPostTranslationEntity>();
        while (iterator.HasMoreResults)
            results.AddRange(await iterator.ReadNextAsync());
        return results;
    }

    public async Task<Dictionary<string, BlogPostTranslationEntity>> GetAllForPostAsDictAsync(string postSlug)
    {
        var list = await GetAllForPostAsync(postSlug);
        return list.ToDictionary(t => t.Lang);
    }

    public async Task UpsertAsync(BlogPostTranslationEntity translation)
    {
        translation.Id = $"{translation.PostSlug}:{translation.Lang}";
        await _container.UpsertItemAsync(translation, new PartitionKey(translation.PostSlug));
    }

    public async Task DeleteAsync(string postSlug, string lang)
    {
        var response = await _container.ReadItemAsync<BlogPostTranslationEntity>(
            $"{postSlug}:{lang}", new PartitionKey(postSlug));
        var entity = response.Resource;
        entity.IsDeleted = true;
        entity.Ttl = 86400;
        await _container.UpsertItemAsync(entity, new PartitionKey(postSlug));
    }

    public async Task DeleteAllForPostAsync(string postSlug)
    {
        var items = await GetAllForPostAsync(postSlug);
        foreach (var item in items)
        {
            item.IsDeleted = true;
            item.Ttl = 86400;
            await _container.UpsertItemAsync(item, new PartitionKey(postSlug));
        }
    }
}
