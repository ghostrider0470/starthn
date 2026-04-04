using Api.DTOs.Roles;

namespace Api.Services.Interfaces;

public interface IRoleService
{
    Task<Dictionary<string, HashSet<string>>> GetRolePermissionMapAsync();
    Task<HashSet<string>> GetPermissionsForRolesAsync(IEnumerable<string> roleNames);
    Task<bool> HasPermissionAsync(IEnumerable<string> roles, string permission);
    Task<bool> IsValidRoleAsync(string roleName);
    Task<List<RoleResponse>> GetAllAsync();
    Task<RoleResponse?> GetByIdAsync(string id);
    Task<RoleResponse> CreateAsync(CreateRoleRequest request);
    Task<RoleResponse?> UpdateAsync(string id, UpdateRoleRequest request);
    Task<bool> DeleteAsync(string id);
    Task<List<PublicRoleResponse>> GetPublicRolesAsync();
    Task SeedDefaultRolesAsync();
    void InvalidateCache();
}
