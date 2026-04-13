using Api.Entities;

namespace Api.Repositories.Interfaces;

public interface IUserPageTranslationRepository
{
    Task<UserPageTranslationEntity?> GetAsync(string userId, string lang);
    Task<Dictionary<string, UserPageTranslationEntity>> GetAllForUserAsDictAsync(string userId);
    Task UpsertAsync(UserPageTranslationEntity translation);
    Task DeleteAsync(string userId, string lang);
}
