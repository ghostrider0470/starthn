using System.Text.RegularExpressions;
using AutoMapper;
using Api.DTOs.CaseStudies;
using Api.Entities;
using Api.Exceptions;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

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
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Conflict)
        {
            throw new ConflictException("A case study with this slug already exists.");
        }
        _logger.LogInformation("Case study created: {Slug}", slug);

        return _mapper.Map<AdminCaseStudyResponse>(doc);
    }

    public async Task<AdminCaseStudyResponse?> UpdateAsync(string slug, UpdateCaseStudyRequest request)
    {
        var existing = await _caseStudyRepo.GetBySlugAsync(slug);
        if (existing == null) return null;

        if (request.Slug != null) existing.Slug = request.Slug;
        if (request.Title != null) existing.Title = request.Title;
        if (request.Client != null) existing.Client = request.Client;
        if (request.Industry != null) existing.Industry = request.Industry;
        if (request.Description != null) existing.Description = request.Description;
        if (request.ExecutiveSummary != null) existing.ExecutiveSummary = request.ExecutiveSummary;
        if (request.Challenge != null) existing.Challenge = request.Challenge;
        if (request.Solution != null) existing.Solution = request.Solution;
        if (request.ArchitectureDecisions != null)
            existing.ArchitectureDecisions = request.ArchitectureDecisions
                .Select(a => new ArchitectureDecisionEntry { Decision = a.Decision, Rationale = a.Rationale })
                .ToList();
        if (request.TechStack != null) existing.TechStack = request.TechStack;
        if (request.Results != null)
            existing.Results = request.Results
                .Select(r => new ResultEntry { Metric = r.Metric, Value = r.Value, Description = r.Description })
                .ToList();
        if (request.Tags != null) existing.Tags = request.Tags;
        if (request.IsPublished.HasValue) existing.IsPublished = request.IsPublished.Value;
        if (request.IsFeatured.HasValue) existing.IsFeatured = request.IsFeatured.Value;
        if (request.CoverImage != null) existing.CoverImage = request.CoverImage;

        var updated = await _caseStudyRepo.ReplaceAsync(existing);

        return _mapper.Map<AdminCaseStudyResponse>(updated);
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
