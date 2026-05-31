using System.IdentityModel.Tokens.Jwt;
using Api.Helpers;
using Api.Middleware;
using Api.Repositories;
using Api.Repositories.Implementations;
using Api.Repositories.Interfaces;
using Api.Services;
using Api.Services.Implementations;
using Api.Services.Interfaces;
using FluentValidation;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Fluent;

// Prevent default claim type mapping (short names like "nameid" → long URIs)
// Must be done once at startup, before any JWT operations
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
JwtSecurityTokenHandler.DefaultOutboundClaimTypeMap.Clear();

var builder = FunctionsApplication.CreateBuilder(args);

builder.UseMiddleware<ExceptionHandlingMiddleware>();

// FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// AutoMapper
builder.Services.AddAutoMapper(cfg => cfg.AddMaps(typeof(Program).Assembly));

// Existing services (already have interfaces in Api.Services namespace)
builder.Services.AddHttpClient<IEmailService, GraphEmailService>();
builder.Services.AddHttpClient<ITurnstileService, TurnstileService>();

// Cosmos DB
var config = builder.Configuration;
var cosmosConnectionString = config["COSMOS_CONNECTION_STRING"]
    ?? throw new InvalidOperationException("COSMOS_CONNECTION_STRING not configured");

builder.Services.AddSingleton(_ =>
{
    var client = new CosmosClientBuilder(cosmosConnectionString)
        .WithSerializerOptions(new CosmosSerializationOptions
        {
            PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase,
        })
        .WithConnectionModeDirect()
        .Build();
    return client;
});

builder.Services.AddSingleton(sp =>
    sp.GetRequiredService<CosmosClient>().GetDatabase("starthn"));

// Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IBlogPostRepository, BlogPostRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<ITagRepository, TagRepository>();
builder.Services.AddScoped<IRoleRepository, RoleRepository>();
builder.Services.AddScoped<ILlmProviderRepository, LlmProviderRepository>();
builder.Services.AddScoped<ILlmSettingsRepository, LlmSettingsRepository>();
builder.Services.AddScoped<IBlogPostTranslationRepository, BlogPostTranslationRepository>();
builder.Services.AddScoped<IUserPageTranslationRepository, UserPageTranslationRepository>();

// JWT
builder.Services.AddSingleton<IJwtService, JwtService>();

// Roles & Permissions
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IPermissionService>(sp => (IPermissionService)sp.GetRequiredService<IRoleService>());

// Auth helpers (token validation + API-key auth for the surviving endpoints).
// NOTE: login/register/token-issuance moved to the Cloudflare Worker; only JWT
// validation + permission checks remain here.
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IApiKeyService, ApiKeyService>();
builder.Services.AddScoped<AuthHelper>();

// Blog (kept for AI translate; BlogService → LlmReview → LlmProvider + WorkerSync)
builder.Services.AddScoped<IBlogService, BlogService>();

// Tags
builder.Services.AddScoped<ITagService, TagService>();

// Categories
builder.Services.AddScoped<ICategoryService, CategoryService>();

// LLM (used by BlogService's review pass and the Chat endpoint)
builder.Services.AddScoped<ILlmProviderService, LlmProviderService>();
builder.Services.AddScoped<ILlmReviewService, LlmReviewService>();

// Chat
builder.Services.AddHttpClient<IChatService, ChatService>();

// Worker sync (BlogService warms edge image manifests)
builder.Services.AddHttpClient<IWorkerSyncService, WorkerSyncService>();

// Translation
builder.Services.AddHttpClient<ITranslationService, TranslationService>();

var app = builder.Build();

// Seed default roles
using (var scope = app.Services.CreateScope())
{
    var roleService = scope.ServiceProvider.GetRequiredService<IRoleService>();
    await roleService.SeedDefaultRolesAsync();
}

await app.RunAsync();


