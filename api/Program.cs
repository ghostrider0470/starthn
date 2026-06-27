using Api.Middleware;
using Api.Services;
using Api.Services.Implementations;
using Api.Services.Interfaces;
using FluentValidation;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = FunctionsApplication.CreateBuilder(args);

builder.UseMiddleware<ExceptionHandlingMiddleware>();

// FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// Email / Turnstile
builder.Services.AddHttpClient<IEmailService, GraphEmailService>();
builder.Services.AddHttpClient<ITurnstileService, TurnstileService>();

// Blog / Tags / Categories — stateless translate-only (no Cosmos)
builder.Services.AddScoped<IBlogService, BlogService>();
builder.Services.AddScoped<ITagService, TagService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();

// LLM review
builder.Services.AddScoped<ILlmReviewService, LlmReviewService>();

// Chat
builder.Services.AddHttpClient<IChatService, ChatService>();

// Translation
builder.Services.AddHttpClient<ITranslationService, TranslationService>();

var app = builder.Build();

await app.RunAsync();
