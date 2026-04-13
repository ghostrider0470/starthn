using Api.Entities;

namespace Api.Repositories.Interfaces;

public interface IRoleRepository
{
    Task<List<RoleEntity>> GetAllAsync();
    Task<RoleEntity?> GetByNameAsync(string name);
    Task InsertAsync(RoleEntity role);
    Task InsertManyAsync(IEnumerable<RoleEntity> roles);
    Task<RoleEntity> ReplaceAsync(RoleEntity entity);
    Task<bool> DeleteAsync(string name);
    Task<long> CountAsync();
}
