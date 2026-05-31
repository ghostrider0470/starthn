using Api.Entities;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;

namespace Api.Services.Implementations;

// Trimmed to GetByIdAsync — the only method still used (by the AI page-translate
// endpoint). All profile/avatar/admin user operations moved to the Cloudflare
// Worker (D1).
public class UserService : IUserService
{
    private readonly IUserRepository _userRepo;

    public UserService(IUserRepository userRepo)
    {
        _userRepo = userRepo;
    }

    public async Task<UserEntity?> GetByIdAsync(string userId)
    {
        return await _userRepo.GetByIdAsync(userId);
    }
}
