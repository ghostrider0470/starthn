using Api.Middleware;
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
builder.Services.AddScoped<ILlmProviderRepository, LlmProviderRepository>();
builder.Services.AddScoped<ILlmSettingsRepository, LlmSettingsRepository>();
builder.Services.AddScoped<IBlogPostTranslationRepository, BlogPostTranslationRepository>();
builder.Services.AddScoped<IUserPageTranslationRepository, UserPageTranslationRepository>();

// User lookup (page translate resolves the user by the Worker-forwarded id).
// No user auth on Azure — the Worker authenticates and forwards a shared secret
// (see Api.Helpers.InternalAuth).
builder.Services.AddScoped<IUserService, UserService>();

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

await app.RunAsync();


