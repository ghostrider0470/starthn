using System.Net;
using Api.DTOs.Auth;
using Api.Exceptions;
using Api.Helpers;
using Api.Services.Interfaces;
using FluentValidation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace Api.Functions;

public class UserManagementFunctions
{
    private readonly IUserService _userService;
    private readonly AuthHelper _auth;
    private readonly IValidator<UpdateUserRolesRequest> _updateRolesValidator;

    public UserManagementFunctions(
        IUserService userService,
        AuthHelper auth,
        IValidator<UpdateUserRolesRequest> updateRolesValidator)
    {
        _userService = userService;
        _auth = auth;
        _updateRolesValidator = updateRolesValidator;
    }

    [Function("AdminGetUsers")]
    public async Task<HttpResponseData> GetUsers(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "manage/users")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "manage:users");

        var search = req.Query["search"];
        var role = req.Query["role"];
        var page = int.TryParse(req.Query["page"], out var p) ? p : 1;
        var pageSize = int.TryParse(req.Query["pageSize"], out var ps) ? ps : 20;

        var (users, total) = await _userService.GetAllUsersAsync(search, role, page, pageSize);

        var response = new
        {
            users = users.Select(u => new AdminUserResponse
            {
                Id = u.Id,
                Email = u.Email,
                FirstName = u.FirstName,
                LastName = u.LastName,
                AvatarUrl = u.AvatarUrl,
                Roles = u.Roles,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt,
                UpdatedAt = u.UpdatedAt,
                Slug = u.Slug,
                Profession = u.Profession,
            }).ToList(),
            total,
            page,
            pageSize,
        };

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, response);
    }

    [Function("AdminGetUser")]
    public async Task<HttpResponseData> GetUser(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "manage/users/{id}")] HttpRequestData req, string id)
    {
        await _auth.RequirePermissionAsync(req, "manage:users");

        var user = await _userService.GetByIdAsync(id)
            ?? throw new NotFoundException("User not found.");

        var response = new AdminUserResponse
        {
            Id = user.Id, Email = user.Email, FirstName = user.FirstName, LastName = user.LastName,
            AvatarUrl = user.AvatarUrl, Roles = user.Roles, IsActive = user.IsActive,
            CreatedAt = user.CreatedAt, UpdatedAt = user.UpdatedAt, Slug = user.Slug, Profession = user.Profession,
        };

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, response);
    }

    [Function("AdminUpdateUserRoles")]
    public async Task<HttpResponseData> UpdateUserRoles(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "manage/users/{id}/roles")] HttpRequestData req, string id)
    {
        var principal = await _auth.RequirePermissionAsync(req, "manage:roles");
        var request = await FunctionHelper.DeserializeAndValidateAsync<UpdateUserRolesRequest>(req, _updateRolesValidator);
        var requestingUserId = AuthHelper.GetUserId(principal);
        await _userService.UpdateUserRolesAsync(id, request.Roles, requestingUserId);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { message = "Roles updated." });
    }

    [Function("AdminUpdateUserStatus")]
    public async Task<HttpResponseData> UpdateUserStatus(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "manage/users/{id}/status")] HttpRequestData req, string id)
    {
        await _auth.RequirePermissionAsync(req, "manage:users");
        var request = await FunctionHelper.DeserializeAndValidateAsync<UpdateUserStatusRequest>(req);
        await _userService.UpdateUserStatusAsync(id, request.IsActive);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { message = "Status updated." });
    }
}
