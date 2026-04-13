using System.Text.Json;
using Api.Services.Interfaces;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace Api.Functions;

public class ChangeFeedSyncFunctions
{
    private readonly IWorkerSyncService _sync;
    private readonly ILogger<ChangeFeedSyncFunctions> _logger;

    public ChangeFeedSyncFunctions(IWorkerSyncService sync, ILogger<ChangeFeedSyncFunctions> logger)
    {
        _sync = sync;
        _logger = logger;
    }

    [Function("SyncBlogPosts")]
    public async Task SyncBlogPosts(
        [CosmosDBTrigger("horizon", "blogPosts",
            Connection = "CosmosDBConnection",
            LeaseContainerName = "leases",
            LeaseContainerPrefix = "blogposts-",
            CreateLeaseContainerIfNotExists = true)]
        IReadOnlyList<JsonElement> changes)
    {
        _logger.LogInformation("ChangeFeed: {Count} blogPosts changes", changes.Count);
        await _sync.SyncEntityAsync("blogPosts", changes);
    }

    [Function("SyncUsers")]
    public async Task SyncUsers(
        [CosmosDBTrigger("horizon", "users",
            Connection = "CosmosDBConnection",
            LeaseContainerName = "leases",
            LeaseContainerPrefix = "users-",
            CreateLeaseContainerIfNotExists = true)]
        IReadOnlyList<JsonElement> changes)
    {
        _logger.LogInformation("ChangeFeed: {Count} users changes", changes.Count);
        await _sync.SyncEntityAsync("users", changes);
    }

    [Function("SyncCategories")]
    public async Task SyncCategories(
        [CosmosDBTrigger("horizon", "categories",
            Connection = "CosmosDBConnection",
            LeaseContainerName = "leases",
            LeaseContainerPrefix = "categories-",
            CreateLeaseContainerIfNotExists = true)]
        IReadOnlyList<JsonElement> changes)
    {
        _logger.LogInformation("ChangeFeed: {Count} categories changes", changes.Count);
        await _sync.SyncEntityAsync("categories", changes);
    }

    [Function("SyncTags")]
    public async Task SyncTags(
        [CosmosDBTrigger("horizon", "tags",
            Connection = "CosmosDBConnection",
            LeaseContainerName = "leases",
            LeaseContainerPrefix = "tags-",
            CreateLeaseContainerIfNotExists = true)]
        IReadOnlyList<JsonElement> changes)
    {
        _logger.LogInformation("ChangeFeed: {Count} tags changes", changes.Count);
        await _sync.SyncEntityAsync("tags", changes);
    }

    [Function("SyncCaseStudies")]
    public async Task SyncCaseStudies(
        [CosmosDBTrigger("horizon", "caseStudies",
            Connection = "CosmosDBConnection",
            LeaseContainerName = "leases",
            LeaseContainerPrefix = "casestudies-",
            CreateLeaseContainerIfNotExists = true)]
        IReadOnlyList<JsonElement> changes)
    {
        _logger.LogInformation("ChangeFeed: {Count} caseStudies changes", changes.Count);
        await _sync.SyncEntityAsync("caseStudies", changes);
    }

    [Function("SyncRoles")]
    public async Task SyncRoles(
        [CosmosDBTrigger("horizon", "roles",
            Connection = "CosmosDBConnection",
            LeaseContainerName = "leases",
            LeaseContainerPrefix = "roles-",
            CreateLeaseContainerIfNotExists = true)]
        IReadOnlyList<JsonElement> changes)
    {
        _logger.LogInformation("ChangeFeed: {Count} roles changes", changes.Count);
        await _sync.SyncEntityAsync("roles", changes);
    }

    [Function("SyncBlogPostTranslations")]
    public async Task SyncBlogPostTranslations(
        [CosmosDBTrigger("horizon", "blogPostTranslations",
            Connection = "CosmosDBConnection",
            LeaseContainerName = "leases",
            LeaseContainerPrefix = "blogposttranslations-",
            CreateLeaseContainerIfNotExists = true)]
        IReadOnlyList<JsonElement> changes)
    {
        _logger.LogInformation("ChangeFeed: {Count} blogPostTranslations changes", changes.Count);
        await _sync.SyncEntityAsync("blogPostTranslations", changes);
    }

    [Function("SyncUserPageTranslations")]
    public async Task SyncUserPageTranslations(
        [CosmosDBTrigger("horizon", "userPageTranslations",
            Connection = "CosmosDBConnection",
            LeaseContainerName = "leases",
            LeaseContainerPrefix = "userpagetranslations-",
            CreateLeaseContainerIfNotExists = true)]
        IReadOnlyList<JsonElement> changes)
    {
        _logger.LogInformation("ChangeFeed: {Count} userPageTranslations changes", changes.Count);
        await _sync.SyncEntityAsync("userPageTranslations", changes);
    }
}
