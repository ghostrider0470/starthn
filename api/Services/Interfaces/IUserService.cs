using Api.Entities;

namespace Api.Services.Interfaces;

public interface IUserService
{
    Task<UserEntity?> GetByIdAsync(string userId);
}
