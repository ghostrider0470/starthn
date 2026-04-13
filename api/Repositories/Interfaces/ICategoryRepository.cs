using Api.Entities;

namespace Api.Repositories.Interfaces;

public interface ICategoryRepository
{
    Task<List<CategoryEntity>> GetAllAsync();
    Task<CategoryEntity?> GetBySlugAsync(string slug);
    Task InsertAsync(CategoryEntity category);
    Task<CategoryEntity> ReplaceAsync(CategoryEntity entity);
    Task<bool> DeleteAsync(string slug);
}
