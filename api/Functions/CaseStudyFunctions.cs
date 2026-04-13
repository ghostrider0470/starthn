using System.Net;
using System.Text.Json;
using Api.DTOs.CaseStudies;
using Api.Exceptions;
using Api.Helpers;
using Api.Services.Interfaces;
using FluentValidation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace Api.Functions;

public class CaseStudyFunctions
{
    private readonly ICaseStudyService _caseStudyService;
    private readonly AuthHelper _auth;
    private readonly IValidator<CreateCaseStudyRequest> _createValidator;
    private readonly IValidator<UpdateCaseStudyRequest> _updateValidator;

    public CaseStudyFunctions(
        ICaseStudyService caseStudyService,
        AuthHelper auth,
        IValidator<CreateCaseStudyRequest> createValidator,
        IValidator<UpdateCaseStudyRequest> updateValidator)
    {
        _caseStudyService = caseStudyService;
        _auth = auth;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    // Public endpoints

    [Function("GetPublishedCaseStudies")]
    public async Task<HttpResponseData> GetPublished(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "case-studies")] HttpRequestData req)
    {
        var caseStudies = await _caseStudyService.GetPublishedAsync();
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, caseStudies);
    }

    [Function("GetCaseStudyBySlug")]
    public async Task<HttpResponseData> GetBySlug(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "case-studies/{slug}")] HttpRequestData req,
        string slug)
    {
        var caseStudy = await _caseStudyService.GetBySlugAsync(slug)
            ?? throw new NotFoundException("Case study not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, caseStudy);
    }

    // Admin endpoints

    [Function("AdminGetAllCaseStudies")]
    public async Task<HttpResponseData> AdminGetAll(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "manage/case-studies")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "manage:case-studies");
        var caseStudies = await _caseStudyService.GetAllAsync();
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, caseStudies);
    }

    [Function("AdminCreateCaseStudy")]
    public async Task<HttpResponseData> AdminCreate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/case-studies")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "manage:case-studies");
        var request = await FunctionHelper.DeserializeAndValidateAsync<CreateCaseStudyRequest>(req, _createValidator);
        var result = await _caseStudyService.CreateAsync(request);
        return await req.CreateJsonResponseAsync(HttpStatusCode.Created, result);
    }

    [Function("AdminUpdateCaseStudy")]
    public async Task<HttpResponseData> AdminUpdate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "manage/case-studies/{slug}")] HttpRequestData req,
        string slug)
    {
        await _auth.RequirePermissionAsync(req, "manage:case-studies");
        var request = await FunctionHelper.DeserializeAndValidateAsync<UpdateCaseStudyRequest>(req, _updateValidator);
        var result = await _caseStudyService.UpdateAsync(slug, request)
            ?? throw new NotFoundException("Case study not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, result);
    }

    [Function("AdminDeleteCaseStudy")]
    public async Task<HttpResponseData> AdminDelete(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "manage/case-studies/{slug}")] HttpRequestData req,
        string slug)
    {
        await _auth.RequirePermissionAsync(req, "manage:case-studies");
        if (!await _caseStudyService.DeleteAsync(slug))
            throw new NotFoundException("Case study not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { message = "Case study deleted." });
    }

    [Function("AdminSeedCaseStudies")]
    public async Task<HttpResponseData> AdminSeed(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/case-studies/seed")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "manage:case-studies");

        var body = await req.ReadAsStringAsync();
        var items = JsonSerializer.Deserialize<List<CreateCaseStudyRequest>>(body!, SharedJsonOptions.Default);
        if (items == null || items.Count == 0)
            throw new AppValidationException("body", "Case studies array is required.");

        var inserted = await _caseStudyService.SeedAsync(items);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { message = $"Seeded {inserted} case studies.", inserted });
    }
}
