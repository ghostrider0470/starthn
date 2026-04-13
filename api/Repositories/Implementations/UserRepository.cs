using Api.Entities;
using Api.Repositories.Interfaces;
using Microsoft.Azure.Cosmos;
using System.Net;

namespace Api.Repositories.Implementations;

public class UserRepository : IUserRepository
{
    private readonly Container _container;

    public UserRepository(CosmosClient client)
    {
        _container = client.GetContainer("horizon", "users");
    }

    public async Task<UserEntity?> GetByIdAsync(string id)
    {
        // Cross-partition query — id is GUID, partition key is email
        var queryDef = new QueryDefinition("SELECT * FROM c WHERE c.id = @id AND (NOT IS_DEFINED(c._deleted) OR c._deleted = false)")
            .WithParameter("@id", id);
        using var iterator = _container.GetItemQueryIterator<UserEntity>(queryDef);
        while (iterator.HasMoreResults)
        {
            var page = await iterator.ReadNextAsync();
            var first = page.FirstOrDefault();
            if (first != null) return first;
        }
        return null;
    }

    public async Task<UserEntity?> GetByEmailAsync(string email)
    {
        var queryDef = new QueryDefinition("SELECT * FROM c WHERE c.email = @email AND (NOT IS_DEFINED(c._deleted) OR c._deleted = false)")
            .WithParameter("@email", email);
        using var iterator = _container.GetItemQueryIterator<UserEntity>(queryDef,
            requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(email) });
        while (iterator.HasMoreResults)
        {
            var page = await iterator.ReadNextAsync();
            var first = page.FirstOrDefault();
            if (first != null) return first;
        }
        return null;
    }

    public async Task<UserEntity?> GetBySlugAsync(string slug)
    {
        // Cross-partition query
        var queryDef = new QueryDefinition("SELECT * FROM c WHERE c.slug = @slug AND (NOT IS_DEFINED(c._deleted) OR c._deleted = false)")
            .WithParameter("@slug", slug);
        using var iterator = _container.GetItemQueryIterator<UserEntity>(queryDef);
        while (iterator.HasMoreResults)
        {
            var page = await iterator.ReadNextAsync();
            var first = page.FirstOrDefault();
            if (first != null) return first;
        }
        return null;
    }

    public async Task<UserEntity?> GetByRefreshTokenHashAsync(string hash)
    {
        // Cross-partition query
        var queryDef = new QueryDefinition("SELECT * FROM c WHERE c.refreshToken = @hash AND (NOT IS_DEFINED(c._deleted) OR c._deleted = false)")
            .WithParameter("@hash", hash);
        using var iterator = _container.GetItemQueryIterator<UserEntity>(queryDef);
        while (iterator.HasMoreResults)
        {
            var page = await iterator.ReadNextAsync();
            var first = page.FirstOrDefault();
            if (first != null) return first;
        }
        return null;
    }

    public async Task<UserEntity?> FindByApiKeyHashAsync(string keyHash)
    {
        // Cross-partition query using EXISTS with array element filter
        var queryDef = new QueryDefinition(
            "SELECT * FROM c WHERE EXISTS(SELECT VALUE k FROM k IN c.apiKeys WHERE k.keyHash = @hash) AND (NOT IS_DEFINED(c._deleted) OR c._deleted = false)")
            .WithParameter("@hash", keyHash);
        using var iterator = _container.GetItemQueryIterator<UserEntity>(queryDef);
        while (iterator.HasMoreResults)
        {
            var page = await iterator.ReadNextAsync();
            var first = page.FirstOrDefault();
            if (first != null) return first;
        }
        return null;
    }

    public async Task<List<UserEntity>> GetByIdsAsync(IEnumerable<string> ids)
    {
        var idList = ids.ToList();
        if (idList.Count == 0) return [];

        var paramNames = idList.Select((_, i) => $"@id{i}").ToList();
        var inClause = string.Join(", ", paramNames);
        var sql = $"SELECT * FROM c WHERE c.id IN ({inClause}) AND (NOT IS_DEFINED(c._deleted) OR c._deleted = false)";

        var queryDef = new QueryDefinition(sql);
        for (int i = 0; i < idList.Count; i++)
            queryDef = queryDef.WithParameter($"@id{i}", idList[i]);

        using var iterator = _container.GetItemQueryIterator<UserEntity>(queryDef);
        var results = new List<UserEntity>();
        while (iterator.HasMoreResults)
            results.AddRange(await iterator.ReadNextAsync());
        return results;
    }

    public async Task<List<UserEntity>> GetByRolesAsync(IEnumerable<string> roles)
    {
        var roleList = roles.ToList();
        if (roleList.Count == 0) return [];

        // ARRAY_CONTAINS with multiple roles: check any role match
        var conditions = roleList.Select((_, i) => $"ARRAY_CONTAINS(c.roles, @role{i})");
        var sql = $"SELECT * FROM c WHERE ({string.Join(" OR ", conditions)}) AND (NOT IS_DEFINED(c._deleted) OR c._deleted = false)";

        var queryDef = new QueryDefinition(sql);
        for (int i = 0; i < roleList.Count; i++)
            queryDef = queryDef.WithParameter($"@role{i}", roleList[i]);

        using var iterator = _container.GetItemQueryIterator<UserEntity>(queryDef);
        var results = new List<UserEntity>();
        while (iterator.HasMoreResults)
            results.AddRange(await iterator.ReadNextAsync());
        return results;
    }

    public async Task<(List<UserEntity> users, long total)> GetAllAsync(
        string? search, string? role, int page, int pageSize)
    {
        var conditions = new List<string> { "(NOT IS_DEFINED(c._deleted) OR c._deleted = false)" };

        if (!string.IsNullOrWhiteSpace(search))
            conditions.Add("(CONTAINS(UPPER(c.firstName), UPPER(@search)) OR CONTAINS(UPPER(c.lastName), UPPER(@search)) OR CONTAINS(UPPER(c.email), UPPER(@search)))");

        if (!string.IsNullOrWhiteSpace(role))
            conditions.Add("ARRAY_CONTAINS(c.roles, @role)");

        var where = $"WHERE {string.Join(" AND ", conditions)}";

        var countSql = $"SELECT VALUE COUNT(1) FROM c {where}";
        var itemsSql = $"SELECT * FROM c {where} ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit";

        var countDef = new QueryDefinition(countSql);
        var itemsDef = new QueryDefinition(itemsSql)
            .WithParameter("@offset", (page - 1) * pageSize)
            .WithParameter("@limit", pageSize);

        if (!string.IsNullOrWhiteSpace(search))
        {
            countDef = countDef.WithParameter("@search", search);
            itemsDef = itemsDef.WithParameter("@search", search);
        }
        if (!string.IsNullOrWhiteSpace(role))
        {
            countDef = countDef.WithParameter("@role", role);
            itemsDef = itemsDef.WithParameter("@role", role);
        }

        using var countIterator = _container.GetItemQueryIterator<int>(countDef);
        var countPage = await countIterator.ReadNextAsync();
        var total = (long)countPage.FirstOrDefault();

        using var iterator = _container.GetItemQueryIterator<UserEntity>(itemsDef);
        var users = new List<UserEntity>();
        while (iterator.HasMoreResults)
            users.AddRange(await iterator.ReadNextAsync());

        return (users, total);
    }

    public async Task InsertAsync(UserEntity user)
    {
        if (string.IsNullOrEmpty(user.Id))
            user.Id = Guid.NewGuid().ToString("N");
        await _container.CreateItemAsync(user, new PartitionKey(user.Email));
    }

    public async Task<UserEntity> ReplaceAsync(UserEntity user)
    {
        user.UpdatedAt = DateTime.UtcNow;
        var response = await _container.ReplaceItemAsync(
            user, user.Id, new PartitionKey(user.Email),
            new ItemRequestOptions { IfMatchEtag = user.ETag });
        return response.Resource;
    }

    public async Task<long> CountAsync()
    {
        var query = new QueryDefinition("SELECT VALUE COUNT(1) FROM c WHERE (NOT IS_DEFINED(c._deleted) OR c._deleted = false)");
        using var iterator = _container.GetItemQueryIterator<int>(query);
        var page = await iterator.ReadNextAsync();
        return page.FirstOrDefault();
    }
}
