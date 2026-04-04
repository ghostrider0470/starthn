using Api.Entities;
using Api.Repositories.Interfaces;
using MongoDB.Driver;

namespace Api.Repositories.Implementations;

public class CategoryRepository : ICategoryRepository
{
    private readonly IMongoCollection<CategoryEntity> _collection;

    public CategoryRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<CategoryEntity>("categories");
    }

    public async Task<List<CategoryEntity>> GetAllAsync() =>
        await _collection
            .Find(FilterDefinition<CategoryEntity>.Empty)
            .SortBy(c => c.Label)
            .ToListAsync();

    public async Task<CategoryEntity?> GetByIdAsync(string id) =>
        await _collection.Find(c => c.Id == id).FirstOrDefaultAsync();

    public async Task InsertAsync(CategoryEntity category) =>
        await _collection.InsertOneAsync(category);

    public async Task<CategoryEntity?> FindOneAndUpdateAsync(
        string id, UpdateDefinition<CategoryEntity> update) =>
        await _collection.FindOneAndUpdateAsync<CategoryEntity>(
            c => c.Id == id,
            update,
            new FindOneAndUpdateOptions<CategoryEntity, CategoryEntity> { ReturnDocument = ReturnDocument.After });

    public async Task UpdateAsync(string id, UpdateDefinition<CategoryEntity> update) =>
        await _collection.UpdateOneAsync(c => c.Id == id, update);

    public async Task<bool> DeleteAsync(string id)
    {
        var result = await _collection.DeleteOneAsync(c => c.Id == id);
        return result.DeletedCount > 0;
    }
}
