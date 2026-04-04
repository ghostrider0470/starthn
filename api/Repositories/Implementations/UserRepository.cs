using Api.Entities;
using Api.Repositories.Interfaces;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Api.Repositories.Implementations;

public class UserRepository : IUserRepository
{
    private readonly IMongoCollection<UserEntity> _collection;

    public UserRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<UserEntity>("users");
    }

    public async Task<UserEntity?> GetByIdAsync(string id) =>
        await _collection.Find(u => u.Id == id).FirstOrDefaultAsync();

    public async Task<UserEntity?> GetByEmailAsync(string email) =>
        await _collection.Find(u => u.Email == email).FirstOrDefaultAsync();

    public async Task<UserEntity?> GetBySlugAsync(string slug) =>
        await _collection.Find(u => u.Slug == slug).FirstOrDefaultAsync();

    public async Task<UserEntity?> GetByRefreshTokenHashAsync(string hash) =>
        await _collection.Find(u => u.RefreshToken == hash).FirstOrDefaultAsync();

    public async Task<UserEntity?> FindByApiKeyHashAsync(string keyHash)
    {
        var filter = Builders<UserEntity>.Filter.ElemMatch(
            u => u.ApiKeys, k => k.KeyHash == keyHash);
        return await _collection.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<List<UserEntity>> GetByIdsAsync(IEnumerable<string> ids)
    {
        var filter = Builders<UserEntity>.Filter.In(u => u.Id, ids);
        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<List<UserEntity>> GetByRolesAsync(IEnumerable<string> roles)
    {
        var filter = Builders<UserEntity>.Filter.AnyIn(u => u.Roles, roles);
        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<(List<UserEntity> users, long total)> GetAllAsync(
        string? search, string? role, int page, int pageSize)
    {
        var filterBuilder = Builders<UserEntity>.Filter;
        var filters = new List<FilterDefinition<UserEntity>>();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchFilter = filterBuilder.Or(
                filterBuilder.Regex(u => u.FirstName, new BsonRegularExpression(search, "i")),
                filterBuilder.Regex(u => u.LastName, new BsonRegularExpression(search, "i")),
                filterBuilder.Regex(u => u.Email, new BsonRegularExpression(search, "i"))
            );
            filters.Add(searchFilter);
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            filters.Add(filterBuilder.AnyEq(u => u.Roles, role));
        }

        var combined = filters.Count > 0
            ? filterBuilder.And(filters)
            : filterBuilder.Empty;

        var total = await _collection.CountDocumentsAsync(combined);
        var users = await _collection
            .Find(combined)
            .SortByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();

        return (users, total);
    }

    public async Task InsertAsync(UserEntity user) =>
        await _collection.InsertOneAsync(user);

    public async Task UpdateAsync(string id, UpdateDefinition<UserEntity> update) =>
        await _collection.UpdateOneAsync(u => u.Id == id, update);

    public async Task<UserEntity?> FindOneAndUpdateAsync(string id, UpdateDefinition<UserEntity> update) =>
        await _collection.FindOneAndUpdateAsync<UserEntity>(
            u => u.Id == id,
            update,
            new FindOneAndUpdateOptions<UserEntity, UserEntity> { ReturnDocument = ReturnDocument.After });

    public async Task<long> CountAsync() =>
        await _collection.CountDocumentsAsync(FilterDefinition<UserEntity>.Empty);
}
