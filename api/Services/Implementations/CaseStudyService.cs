using System.Text.RegularExpressions;
using AutoMapper;
using Api.DTOs.CaseStudies;
using Api.Entities;
using Api.Exceptions;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Api.Services.Implementations;

public partial class CaseStudyService : ICaseStudyService
{
    private readonly ICaseStudyRepository _caseStudyRepo;
    private readonly IMapper _mapper;
    private readonly ILogger<CaseStudyService> _logger;

    public CaseStudyService(ICaseStudyRepository caseStudyRepo, IMapper mapper, ILogger<CaseStudyService> logger)
    {
        _caseStudyRepo = caseStudyRepo;
        _mapper = mapper;
        _logger = logger;
    }

    // Public endpoints

    public async Task<List<CaseStudyResponse>> GetPublishedAsync()
    {
        var docs = await _caseStudyRepo.GetPublishedAsync();
        return _mapper.Map<List<CaseStudyResponse>>(docs);
    }

    public async Task<CaseStudyResponse?> GetBySlugAsync(string slug)
    {
        var doc = await _caseStudyRepo.GetBySlugAsync(slug, publishedOnly: true);
        return doc != null ? _mapper.Map<CaseStudyResponse>(doc) : null;
    }

    // Admin endpoints

    public async Task<List<AdminCaseStudyResponse>> GetAllAsync()
    {
        var docs = await _caseStudyRepo.GetAllAsync();
        return _mapper.Map<List<AdminCaseStudyResponse>>(docs);
    }

    public async Task<AdminCaseStudyResponse> CreateAsync(CreateCaseStudyRequest request)
    {
        var slug = string.IsNullOrWhiteSpace(request.Slug)
            ? GenerateSlug(request.Title)
            : request.Slug;

        var doc = new CaseStudyEntity
        {
            Slug = slug,
            Title = request.Title,
            Client = request.Client,
            Industry = request.Industry,
            Description = request.Description,
            ExecutiveSummary = request.ExecutiveSummary,
            Challenge = request.Challenge,
            Solution = request.Solution,
            ArchitectureDecisions = request.ArchitectureDecisions
                .Select(a => new ArchitectureDecisionEntry { Decision = a.Decision, Rationale = a.Rationale })
                .ToList(),
            TechStack = request.TechStack,
            Results = request.Results
                .Select(r => new ResultEntry { Metric = r.Metric, Value = r.Value, Description = r.Description })
                .ToList(),
            Tags = request.Tags,
            IsPublished = request.IsPublished,
            IsFeatured = request.IsFeatured,
            CoverImage = request.CoverImage,
        };

        try
        {
            await _caseStudyRepo.InsertAsync(doc);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            throw new ConflictException("A case study with this slug already exists.");
        }
        _logger.LogInformation("Case study created: {Slug}", slug);

        return _mapper.Map<AdminCaseStudyResponse>(doc);
    }

    public async Task<AdminCaseStudyResponse?> UpdateAsync(string slug, UpdateCaseStudyRequest request)
    {
        var updates = new List<UpdateDefinition<CaseStudyEntity>>();

        if (request.Slug != null) updates.Add(Builders<CaseStudyEntity>.Update.Set(d => d.Slug, request.Slug));
        if (request.Title != null) updates.Add(Builders<CaseStudyEntity>.Update.Set(d => d.Title, request.Title));
        if (request.Client != null) updates.Add(Builders<CaseStudyEntity>.Update.Set(d => d.Client, request.Client));
        if (request.Industry != null) updates.Add(Builders<CaseStudyEntity>.Update.Set(d => d.Industry, request.Industry));
        if (request.Description != null) updates.Add(Builders<CaseStudyEntity>.Update.Set(d => d.Description, request.Description));
        if (request.ExecutiveSummary != null) updates.Add(Builders<CaseStudyEntity>.Update.Set(d => d.ExecutiveSummary, request.ExecutiveSummary));
        if (request.Challenge != null) updates.Add(Builders<CaseStudyEntity>.Update.Set(d => d.Challenge, request.Challenge));
        if (request.Solution != null) updates.Add(Builders<CaseStudyEntity>.Update.Set(d => d.Solution, request.Solution));
        if (request.ArchitectureDecisions != null)
            updates.Add(Builders<CaseStudyEntity>.Update.Set(d => d.ArchitectureDecisions,
                request.ArchitectureDecisions
                    .Select(a => new ArchitectureDecisionEntry { Decision = a.Decision, Rationale = a.Rationale })
                    .ToList()));
        if (request.TechStack != null) updates.Add(Builders<CaseStudyEntity>.Update.Set(d => d.TechStack, request.TechStack));
        if (request.Results != null)
            updates.Add(Builders<CaseStudyEntity>.Update.Set(d => d.Results,
                request.Results
                    .Select(r => new ResultEntry { Metric = r.Metric, Value = r.Value, Description = r.Description })
                    .ToList()));
        if (request.Tags != null) updates.Add(Builders<CaseStudyEntity>.Update.Set(d => d.Tags, request.Tags));
        if (request.IsPublished.HasValue) updates.Add(Builders<CaseStudyEntity>.Update.Set(d => d.IsPublished, request.IsPublished.Value));
        if (request.IsFeatured.HasValue) updates.Add(Builders<CaseStudyEntity>.Update.Set(d => d.IsFeatured, request.IsFeatured.Value));
        if (request.CoverImage != null) updates.Add(Builders<CaseStudyEntity>.Update.Set(d => d.CoverImage, request.CoverImage));

        if (updates.Count == 0) return null;

        updates.Add(Builders<CaseStudyEntity>.Update.Set(d => d.UpdatedAt, DateTime.UtcNow));

        var combined = Builders<CaseStudyEntity>.Update.Combine(updates);
        var updated = await _caseStudyRepo.FindOneAndUpdateAsync(slug, combined);

        return updated != null ? _mapper.Map<AdminCaseStudyResponse>(updated) : null;
    }

    public async Task<bool> DeleteAsync(string slug)
    {
        return await _caseStudyRepo.DeleteAsync(slug);
    }

    public async Task<int> SeedAsync(List<CreateCaseStudyRequest> items)
    {
        var inserted = 0;

        foreach (var item in items)
        {
            var slug = string.IsNullOrWhiteSpace(item.Slug)
                ? GenerateSlug(item.Title)
                : item.Slug;

            var existing = await _caseStudyRepo.GetBySlugAsync(slug);
            if (existing != null) continue;

            var doc = new CaseStudyEntity
            {
                Slug = slug,
                Title = item.Title,
                Client = item.Client,
                Industry = item.Industry,
                Description = item.Description,
                ExecutiveSummary = item.ExecutiveSummary,
                Challenge = item.Challenge,
                Solution = item.Solution,
                ArchitectureDecisions = item.ArchitectureDecisions
                    .Select(a => new ArchitectureDecisionEntry { Decision = a.Decision, Rationale = a.Rationale })
                    .ToList(),
                TechStack = item.TechStack,
                Results = item.Results
                    .Select(r => new ResultEntry { Metric = r.Metric, Value = r.Value, Description = r.Description })
                    .ToList(),
                Tags = item.Tags,
                IsPublished = item.IsPublished,
                IsFeatured = item.IsFeatured,
                CoverImage = item.CoverImage,
            };

            await _caseStudyRepo.InsertAsync(doc);
            inserted++;
        }

        _logger.LogInformation("Seeded {Count} case studies", inserted);
        return inserted;
    }

    // Helpers

    private static string GenerateSlug(string title)
    {
        var slug = title.ToLowerInvariant();
        slug = SlugInvalidChars().Replace(slug, "");
        slug = SlugWhitespace().Replace(slug, "-");
        slug = SlugMultipleDashes().Replace(slug, "-");
        return slug.Trim('-');
    }

    [GeneratedRegex(@"[^a-z0-9\s-]")]
    private static partial Regex SlugInvalidChars();

    [GeneratedRegex(@"\s+")]
    private static partial Regex SlugWhitespace();

    [GeneratedRegex(@"-+")]
    private static partial Regex SlugMultipleDashes();
}
