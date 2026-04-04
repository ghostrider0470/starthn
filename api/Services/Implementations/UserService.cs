using Api.DTOs.Auth;
using Api.Entities;
using Api.Exceptions;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using MongoDB.Driver;

namespace Api.Services.Implementations;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepo;
    private readonly IPermissionService _permissionService;

    public UserService(IUserRepository userRepo, IPermissionService permissionService)
    {
        _userRepo = userRepo;
        _permissionService = permissionService;
    }

    public async Task<UserEntity?> GetByIdAsync(string userId)
    {
        return await _userRepo.GetByIdAsync(userId);
    }

    public async Task UpdateProfileAsync(string userId, UpdateProfileRequest request)
    {
        var updates = new List<UpdateDefinition<UserEntity>>();

        if (request.FirstName != null)
            updates.Add(Builders<UserEntity>.Update.Set(u => u.FirstName, request.FirstName));
        if (request.LastName != null)
            updates.Add(Builders<UserEntity>.Update.Set(u => u.LastName, request.LastName));
        if (request.PhoneNumber != null)
            updates.Add(Builders<UserEntity>.Update.Set(u => u.PhoneNumber, request.PhoneNumber));
        if (request.EmailNotifications.HasValue)
            updates.Add(Builders<UserEntity>.Update.Set(u => u.EmailNotifications, request.EmailNotifications.Value));
        if (request.SmsNotifications.HasValue)
            updates.Add(Builders<UserEntity>.Update.Set(u => u.SmsNotifications, request.SmsNotifications.Value));
        if (request.Bio != null)
            updates.Add(Builders<UserEntity>.Update.Set(u => u.Bio, request.Bio));
        if (request.Profession != null)
            updates.Add(Builders<UserEntity>.Update.Set(u => u.Profession, request.Profession));
        if (request.Expertise != null)
            updates.Add(Builders<UserEntity>.Update.Set(u => u.Expertise, request.Expertise));
        if (request.SocialLinks != null)
            updates.Add(Builders<UserEntity>.Update.Set(u => u.SocialLinks, request.SocialLinks));
        if (request.Slug != null)
            updates.Add(Builders<UserEntity>.Update.Set(u => u.Slug, request.Slug));
        if (request.PageContent != null)
            updates.Add(Builders<UserEntity>.Update.Set(u => u.PageContent, request.PageContent));

        if (updates.Count == 0) return;

        updates.Add(Builders<UserEntity>.Update.Set(u => u.UpdatedAt, DateTime.UtcNow));

        var combined = Builders<UserEntity>.Update.Combine(updates);
        await _userRepo.UpdateAsync(userId, combined);
    }

    public async Task ChangePasswordAsync(string userId, string currentPassword, string newPassword)
    {
        var user = await _userRepo.GetByIdAsync(userId)
            ?? throw new InvalidOperationException("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
            throw new AppValidationException("password", "Current password is incorrect.");

        var newHash = BCrypt.Net.BCrypt.HashPassword(newPassword, workFactor: 12);

        var update = Builders<UserEntity>.Update
            .Set(u => u.PasswordHash, newHash)
            .Set(u => u.UpdatedAt, DateTime.UtcNow);

        await _userRepo.UpdateAsync(userId, update);
    }

    public async Task UpdateAvatarAsync(string userId, string avatarUrl)
    {
        var update = Builders<UserEntity>.Update
            .Set(u => u.AvatarUrl, avatarUrl)
            .Set(u => u.UpdatedAt, DateTime.UtcNow);

        await _userRepo.UpdateAsync(userId, update);
    }

    public async Task<UserEntity?> GetBySlugAsync(string slug)
    {
        return await _userRepo.GetBySlugAsync(slug);
    }

    public async Task<List<UserEntity>> GetByIdsAsync(IEnumerable<string> userIds)
    {
        return await _userRepo.GetByIdsAsync(userIds);
    }

    public async Task<List<UserEntity>> GetAuthorCandidatesAsync()
    {
        return await _userRepo.GetByRolesAsync(new[] { "Employee", "Owner", "MasterAdmin" });
    }

    public async Task<long> GetTotalUsersAsync()
    {
        return await _userRepo.CountAsync();
    }

    public async Task<(List<UserEntity> users, long total)> GetAllUsersAsync(
        string? search = null, string? role = null, int page = 1, int pageSize = 20)
    {
        return await _userRepo.GetAllAsync(search, role, page, pageSize);
    }

    public async Task UpdateUserRolesAsync(string userId, List<string> roles, string requestingUserId)
    {
        // Safety: cannot remove MasterAdmin from yourself
        if (userId == requestingUserId && !roles.Contains("MasterAdmin"))
        {
            var currentUser = await GetByIdAsync(requestingUserId);
            if (currentUser != null && currentUser.Roles.Contains("MasterAdmin"))
            {
                throw new InvalidOperationException("Cannot remove your own MasterAdmin role.");
            }
        }

        // Validate all role names
        foreach (var role in roles)
        {
            if (!await _permissionService.IsValidRoleAsync(role))
                throw new ArgumentException($"Invalid role: {role}");
        }

        var update = Builders<UserEntity>.Update
            .Set(u => u.Roles, roles)
            .Set(u => u.UpdatedAt, DateTime.UtcNow);

        await _userRepo.UpdateAsync(userId, update);
    }

    public async Task UpdateUserStatusAsync(string userId, bool isActive)
    {
        var update = Builders<UserEntity>.Update
            .Set(u => u.IsActive, isActive)
            .Set(u => u.UpdatedAt, DateTime.UtcNow);

        await _userRepo.UpdateAsync(userId, update);
    }

    public async Task UpdatePageTranslationsAsync(string userId, Dictionary<string, Api.DTOs.Auth.PageTranslation> translations)
    {
        var update = Builders<UserEntity>.Update
            .Set(u => u.PageTranslations, translations)
            .Set(u => u.UpdatedAt, DateTime.UtcNow);

        await _userRepo.UpdateAsync(userId, update);
    }
}
