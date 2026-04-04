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
using MongoDB.Driver;

// Prevent default claim type mapping (short names like "nameid" → long URIs)
// Must be done once at startup, before any JWT operations
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
JwtSecurityTokenHandler.DefaultOutboundClaimTypeMap.Clear();

var builder = FunctionsApplication.CreateBuilder(args);

builder.UseMiddleware<ExceptionHandlingMiddleware>();

// FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// AutoMapper
builder.Services.AddAutoMapper(typeof(Program));

// Existing services (already have interfaces in Api.Services namespace)
builder.Services.AddHttpClient<IEmailService, GraphEmailService>();
builder.Services.AddHttpClient<ITurnstileService, TurnstileService>();

// MongoDB
var mongoConnectionString = Environment.GetEnvironmentVariable("MONGODB_CONNECTION_STRING")
    ?? "mongodb://localhost:27017";
builder.Services.AddSingleton<IMongoClient>(new MongoClient(mongoConnectionString));
builder.Services.AddSingleton<IMongoDatabase>(sp =>
{
    var client = sp.GetRequiredService<IMongoClient>();
    var dbName = Environment.GetEnvironmentVariable("MONGODB_DATABASE_NAME") ?? "horizon";
    return client.GetDatabase(dbName);
});

// Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IBlogPostRepository, BlogPostRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<ITagRepository, TagRepository>();
builder.Services.AddScoped<IRoleRepository, RoleRepository>();
builder.Services.AddScoped<ICaseStudyRepository, CaseStudyRepository>();
builder.Services.AddScoped<ILlmProviderRepository, LlmProviderRepository>();
builder.Services.AddScoped<ILlmSettingsRepository, LlmSettingsRepository>();

// Database initializer
builder.Services.AddSingleton<DatabaseInitializer>();

// JWT
builder.Services.AddSingleton<IJwtService, JwtService>();

// Roles & Permissions
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IPermissionService>(sp => (IPermissionService)sp.GetRequiredService<IRoleService>());

// Auth & User
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IApiKeyService, ApiKeyService>();
builder.Services.AddScoped<AuthHelper>();

// Blog
builder.Services.AddScoped<IBlogService, BlogService>();

// Case Studies
builder.Services.AddScoped<ICaseStudyService, CaseStudyService>();

// Tags
builder.Services.AddScoped<ITagService, TagService>();

// Categories
builder.Services.AddScoped<ICategoryService, CategoryService>();

// LLM
builder.Services.AddScoped<ILlmProviderService, LlmProviderService>();
builder.Services.AddScoped<ILlmReviewService, LlmReviewService>();

// Chat
builder.Services.AddHttpClient<IChatService, ChatService>();

// Blob Storage
builder.Services.AddSingleton<IBlobStorageService, BlobStorageService>();

// Translation
builder.Services.AddHttpClient<ITranslationService, TranslationService>();

var app = builder.Build();

// Create indexes on startup
var dbInitializer = app.Services.GetRequiredService<DatabaseInitializer>();
await dbInitializer.CreateIndexesAsync();

// Seed default roles
using (var scope = app.Services.CreateScope())
{
    var roleService = scope.ServiceProvider.GetRequiredService<IRoleService>();
    await roleService.SeedDefaultRolesAsync();
}

await app.RunAsync();
