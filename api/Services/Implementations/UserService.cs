using Api.DTOs.Auth;
using Api.Entities;
using Api.Exceptions;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;

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
        var user = await _userRepo.GetByIdAsync(userId)
            ?? throw new NotFoundException("User not found.");

        if (request.FirstName != null) user.FirstName = request.FirstName;
        if (request.LastName != null) user.LastName = request.LastName;
        if (request.PhoneNumber != null) user.PhoneNumber = request.PhoneNumber;
        if (request.EmailNotifications.HasValue) user.EmailNotifications = request.EmailNotifications.Value;
        if (request.SmsNotifications.HasValue) user.SmsNotifications = request.SmsNotifications.Value;
        if (request.Bio != null) user.Bio = request.Bio;
        if (request.Profession != null) user.Profession = request.Profession;
        if (request.Expertise != null) user.Expertise = request.Expertise;
        if (request.SocialLinks != null) user.SocialLinks = request.SocialLinks;
        if (request.Slug != null) user.Slug = request.Slug;
        if (request.PageContent != null) user.PageContent = new List<object> { request.PageContent };

        await _userRepo.ReplaceAsync(user);
    }

    public async Task ChangePasswordAsync(string userId, string currentPassword, string newPassword)
    {
        var user = await _userRepo.GetByIdAsync(userId)
            ?? throw new InvalidOperationException("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
            throw new AppValidationException("password", "Current password is incorrect.");

        var newHash = BCrypt.Net.BCrypt.HashPassword(newPassword, workFactor: 12);

        user.PasswordHash = newHash;
        await _userRepo.ReplaceAsync(user);
    }

    public async Task UpdateAvatarAsync(string userId, string? avatarUrl)
    {
        var user = await _userRepo.GetByIdAsync(userId)
            ?? throw new NotFoundException("User not found.");

        user.AvatarUrl = avatarUrl;
        await _userRepo.ReplaceAsync(user);
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

        var user = await _userRepo.GetByIdAsync(userId)
            ?? throw new NotFoundException("User not found.");

        user.Roles = roles;
        await _userRepo.ReplaceAsync(user);
    }

    public async Task UpdateUserStatusAsync(string userId, bool isActive)
    {
        var user = await _userRepo.GetByIdAsync(userId)
            ?? throw new NotFoundException("User not found.");

        user.IsActive = isActive;
        await _userRepo.ReplaceAsync(user);
    }

}
