using Api.Entities;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Api.Repositories;

public class DatabaseInitializer
{
    private readonly IMongoDatabase _database;
    private readonly ILogger<DatabaseInitializer> _logger;

    public DatabaseInitializer(IMongoDatabase database, ILogger<DatabaseInitializer> logger)
    {
        _database = database;
        _logger = logger;
    }

    public async Task CreateIndexesAsync()
    {
        try
        {
            var users = _database.GetCollection<UserEntity>("users");
            var blogPosts = _database.GetCollection<BlogPostEntity>("blogPosts");
            var tags = _database.GetCollection<TagEntity>("tags");
            var categories = _database.GetCollection<CategoryEntity>("categories");
            var caseStudies = _database.GetCollection<CaseStudyEntity>("caseStudies");
            var roles = _database.GetCollection<RoleEntity>("roles");

            // Unique email index on Users
            await users.Indexes.CreateOneAsync(
                new CreateIndexModel<UserEntity>(
                    Builders<UserEntity>.IndexKeys.Ascending(u => u.Email),
                    new CreateIndexOptions { Unique = true }));

            // Index on RefreshToken for token lookup
            await users.Indexes.CreateOneAsync(
                new CreateIndexModel<UserEntity>(
                    Builders<UserEntity>.IndexKeys.Ascending(u => u.RefreshToken)));

            // Index on apiKeys.keyHash for API key lookup
            await users.Indexes.CreateOneAsync(
                new CreateIndexModel<UserEntity>(
                    Builders<UserEntity>.IndexKeys.Ascending("apiKeys.keyHash")));

            // Unique slug index on BlogPosts
            await blogPosts.Indexes.CreateOneAsync(
                new CreateIndexModel<BlogPostEntity>(
                    Builders<BlogPostEntity>.IndexKeys.Ascending(b => b.Slug),
                    new CreateIndexOptions { Unique = true }));

            // Compound index for published posts sorted by date
            await blogPosts.Indexes.CreateOneAsync(
                new CreateIndexModel<BlogPostEntity>(
                    Builders<BlogPostEntity>.IndexKeys
                        .Ascending(b => b.IsPublished)
                        .Descending(b => b.PublishedAt)));

            // Unique slug index on Tags
            await tags.Indexes.CreateOneAsync(
                new CreateIndexModel<TagEntity>(
                    Builders<TagEntity>.IndexKeys.Ascending(t => t.Slug),
                    new CreateIndexOptions { Unique = true }));

            // Unique slug index on Categories
            await categories.Indexes.CreateOneAsync(
                new CreateIndexModel<CategoryEntity>(
                    Builders<CategoryEntity>.IndexKeys.Ascending(c => c.Slug),
                    new CreateIndexOptions { Unique = true }));

            // Unique slug index on CaseStudies
            await caseStudies.Indexes.CreateOneAsync(
                new CreateIndexModel<CaseStudyEntity>(
                    Builders<CaseStudyEntity>.IndexKeys.Ascending(cs => cs.Slug),
                    new CreateIndexOptions { Unique = true }));

            // Unique name index on Roles
            await roles.Indexes.CreateOneAsync(
                new CreateIndexModel<RoleEntity>(
                    Builders<RoleEntity>.IndexKeys.Ascending(r => r.Name),
                    new CreateIndexOptions { Unique = true }));

            // Unique slug index on Roles
            await roles.Indexes.CreateOneAsync(
                new CreateIndexModel<RoleEntity>(
                    Builders<RoleEntity>.IndexKeys.Ascending(r => r.Slug),
                    new CreateIndexOptions { Unique = true }));

            _logger.LogInformation("MongoDB indexes created successfully");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to create MongoDB indexes (may already exist)");
        }
    }
}
