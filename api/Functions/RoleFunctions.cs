using System.Net;
using Api.Configuration;
using Api.DTOs.Roles;
using Api.Exceptions;
using Api.Helpers;
using Api.Services.Interfaces;
using FluentValidation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace Api.Functions;

public class RoleFunctions
{
    private readonly IRoleService _roleService;
    private readonly AuthHelper _auth;
    private readonly IValidator<CreateRoleRequest> _createValidator;
    private readonly IValidator<UpdateRoleRequest> _updateValidator;

    public RoleFunctions(
        IRoleService roleService,
        AuthHelper auth,
        IValidator<CreateRoleRequest> createValidator,
        IValidator<UpdateRoleRequest> updateValidator)
    {
        _roleService = roleService;
        _auth = auth;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    // Public endpoints

    [Function("GetPublicRoles")]
    public async Task<HttpResponseData> GetPublicRoles(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "roles")] HttpRequestData req)
    {
        var roles = await _roleService.GetPublicRolesAsync();
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, roles);
    }

    [Function("GetPermissions")]
    public async Task<HttpResponseData> GetPermissions(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "permissions")] HttpRequestData req)
    {
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, Permissions.Groups);
    }

    // Admin endpoints

    [Function("AdminGetRoles")]
    public async Task<HttpResponseData> AdminGetRoles(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "manage/roles")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "manage:roles");
        var roles = await _roleService.GetAllAsync();
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, roles);
    }

    [Function("AdminCreateRole")]
    public async Task<HttpResponseData> AdminCreateRole(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/roles")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "manage:roles");
        var request = await FunctionHelper.DeserializeAndValidateAsync<CreateRoleRequest>(req, _createValidator);
        var role = await _roleService.CreateAsync(request);
        return await req.CreateJsonResponseAsync(HttpStatusCode.Created, role);
    }

    [Function("AdminUpdateRole")]
    public async Task<HttpResponseData> AdminUpdateRole(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "manage/roles/{id}")] HttpRequestData req,
        string id)
    {
        await _auth.RequirePermissionAsync(req, "manage:roles");
        var request = await FunctionHelper.DeserializeAndValidateAsync<UpdateRoleRequest>(req, _updateValidator);
        var role = await _roleService.UpdateAsync(id, request)
            ?? throw new NotFoundException("Role not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, role);
    }

    [Function("AdminDeleteRole")]
    public async Task<HttpResponseData> AdminDeleteRole(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "manage/roles/{id}")] HttpRequestData req,
        string id)
    {
        await _auth.RequirePermissionAsync(req, "manage:roles");
        if (!await _roleService.DeleteAsync(id))
            throw new NotFoundException("Role not found.");
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { message = "Role deleted." });
    }
}
