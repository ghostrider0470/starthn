using Api.Entities;
using MongoDB.Driver;

namespace Api.Repositories.Interfaces;

public interface IRoleRepository
{
    Task<List<RoleEntity>> GetAllAsync();
    Task<RoleEntity?> GetByIdAsync(string id);
    Task<RoleEntity?> GetByNameAsync(string name);
    Task InsertAsync(RoleEntity role);
    Task InsertManyAsync(IEnumerable<RoleEntity> roles);
    Task<RoleEntity?> FindOneAndUpdateAsync(string id, UpdateDefinition<RoleEntity> update);
    Task<bool> DeleteAsync(string id);
    Task<long> CountAsync();
}
