using Api.Entities;
using MongoDB.Driver;

namespace Api.Repositories.Interfaces;

public interface ITagRepository
{
    Task<List<TagEntity>> GetAllAsync();
    Task<TagEntity?> GetByIdAsync(string id);
    Task InsertAsync(TagEntity tag);
    Task<TagEntity?> FindOneAndUpdateAsync(string id, UpdateDefinition<TagEntity> update);
    Task UpdateAsync(string id, UpdateDefinition<TagEntity> update);
    Task<bool> DeleteAsync(string id);
}
