using Api.Entities;

namespace Api.Repositories.Interfaces;

public interface IUserRepository
{
    Task<UserEntity?> GetByIdAsync(string id);
    Task<UserEntity?> GetByEmailAsync(string email);
    Task<UserEntity?> GetBySlugAsync(string slug);
    Task<UserEntity?> GetByRefreshTokenHashAsync(string hash);
    Task<UserEntity?> FindByApiKeyHashAsync(string keyHash);
    Task<List<UserEntity>> GetByIdsAsync(IEnumerable<string> ids);
    Task<List<UserEntity>> GetByRolesAsync(IEnumerable<string> roles);
    Task<(List<UserEntity> users, long total)> GetAllAsync(string? search, string? role, int page, int pageSize);
    Task InsertAsync(UserEntity user);
    Task<UserEntity> ReplaceAsync(UserEntity user);
    Task<long> CountAsync();
}
