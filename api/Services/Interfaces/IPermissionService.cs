namespace Api.Services.Interfaces;

public interface IPermissionService
{
    Task<bool> HasPermissionAsync(IEnumerable<string> roles, string permission);
    Task<bool> HasAnyPermissionAsync(IEnumerable<string> roles, params string[] permissions);
    Task<HashSet<string>> GetPermissionsForRolesAsync(IEnumerable<string> roleNames);
    Task<bool> IsValidRoleAsync(string roleName);
}
