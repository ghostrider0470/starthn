using Api.Entities;
using Api.Repositories.Interfaces;
using MongoDB.Driver;

namespace Api.Repositories.Implementations;

public class RoleRepository : IRoleRepository
{
    private readonly IMongoCollection<RoleEntity> _collection;

    public RoleRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<RoleEntity>("roles");
    }

    public async Task<List<RoleEntity>> GetAllAsync() =>
        await _collection
            .Find(FilterDefinition<RoleEntity>.Empty)
            .SortBy(r => r.Name)
            .ToListAsync();

    public async Task<RoleEntity?> GetByIdAsync(string id) =>
        await _collection.Find(r => r.Id == id).FirstOrDefaultAsync();

    public async Task<RoleEntity?> GetByNameAsync(string name) =>
        await _collection.Find(r => r.Name == name).FirstOrDefaultAsync();

    public async Task InsertAsync(RoleEntity role) =>
        await _collection.InsertOneAsync(role);

    public async Task InsertManyAsync(IEnumerable<RoleEntity> roles) =>
        await _collection.InsertManyAsync(roles);

    public async Task<RoleEntity?> FindOneAndUpdateAsync(
        string id, UpdateDefinition<RoleEntity> update) =>
        await _collection.FindOneAndUpdateAsync<RoleEntity>(
            r => r.Id == id,
            update,
            new FindOneAndUpdateOptions<RoleEntity, RoleEntity> { ReturnDocument = ReturnDocument.After });

    public async Task<bool> DeleteAsync(string id)
    {
        var result = await _collection.DeleteOneAsync(r => r.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<long> CountAsync() =>
        await _collection.CountDocumentsAsync(FilterDefinition<RoleEntity>.Empty);
}
