using Api.Entities;

namespace Api.Repositories.Interfaces;

public interface ITagRepository
{
    Task<List<TagEntity>> GetAllAsync();
    Task<TagEntity?> GetBySlugAsync(string slug);
    Task InsertAsync(TagEntity tag);
    Task<TagEntity> ReplaceAsync(TagEntity entity);
    Task<bool> DeleteAsync(string slug);
}
