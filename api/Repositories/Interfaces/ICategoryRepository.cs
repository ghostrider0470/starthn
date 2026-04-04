using Api.Entities;
using MongoDB.Driver;

namespace Api.Repositories.Interfaces;

public interface ICategoryRepository
{
    Task<List<CategoryEntity>> GetAllAsync();
    Task<CategoryEntity?> GetByIdAsync(string id);
    Task InsertAsync(CategoryEntity category);
    Task<CategoryEntity?> FindOneAndUpdateAsync(string id, UpdateDefinition<CategoryEntity> update);
    Task UpdateAsync(string id, UpdateDefinition<CategoryEntity> update);
    Task<bool> DeleteAsync(string id);
}
