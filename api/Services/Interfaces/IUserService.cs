using Api.DTOs.Auth;
using Api.Entities;

namespace Api.Services.Interfaces;

public interface IUserService
{
    Task<UserEntity?> GetByIdAsync(string userId);
    Task UpdateProfileAsync(string userId, UpdateProfileRequest request);
    Task ChangePasswordAsync(string userId, string currentPassword, string newPassword);
    Task UpdateAvatarAsync(string userId, string avatarUrl);
    Task<UserEntity?> GetBySlugAsync(string slug);
    Task<List<UserEntity>> GetByIdsAsync(IEnumerable<string> userIds);
    Task<List<UserEntity>> GetAuthorCandidatesAsync();
    Task<long> GetTotalUsersAsync();
    Task<(List<UserEntity> users, long total)> GetAllUsersAsync(string? search = null, string? role = null, int page = 1, int pageSize = 20);
    Task UpdateUserRolesAsync(string userId, List<string> roles, string requestingUserId);
    Task UpdateUserStatusAsync(string userId, bool isActive);
    Task UpdatePageTranslationsAsync(string userId, Dictionary<string, PageTranslation> translations);
}
