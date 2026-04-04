using Api.Entities;
using Api.Repositories.Interfaces;
using MongoDB.Driver;

namespace Api.Repositories.Implementations;

public class TagRepository : ITagRepository
{
    private readonly IMongoCollection<TagEntity> _collection;

    public TagRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<TagEntity>("tags");
    }

    public async Task<List<TagEntity>> GetAllAsync() =>
        await _collection
            .Find(FilterDefinition<TagEntity>.Empty)
            .SortBy(t => t.Label)
            .ToListAsync();

    public async Task<TagEntity?> GetByIdAsync(string id) =>
        await _collection.Find(t => t.Id == id).FirstOrDefaultAsync();

    public async Task InsertAsync(TagEntity tag) =>
        await _collection.InsertOneAsync(tag);

    public async Task<TagEntity?> FindOneAndUpdateAsync(
        string id, UpdateDefinition<TagEntity> update) =>
        await _collection.FindOneAndUpdateAsync<TagEntity>(
            t => t.Id == id,
            update,
            new FindOneAndUpdateOptions<TagEntity, TagEntity> { ReturnDocument = ReturnDocument.After });

    public async Task UpdateAsync(string id, UpdateDefinition<TagEntity> update) =>
        await _collection.UpdateOneAsync(t => t.Id == id, update);

    public async Task<bool> DeleteAsync(string id)
    {
        var result = await _collection.DeleteOneAsync(t => t.Id == id);
        return result.DeletedCount > 0;
    }
}
