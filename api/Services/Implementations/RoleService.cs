using System.Text.RegularExpressions;
using AutoMapper;
using Api.Configuration;
using Api.Entities;
using Api.DTOs.Roles;
using Api.Exceptions;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Api.Services.Implementations;

public class RoleService : IRoleService, IPermissionService
{
    private readonly IRoleRepository _roleRepo;
    private readonly IMapper _mapper;
    private readonly ILogger<RoleService> _logger;

    private volatile Dictionary<string, HashSet<string>>? _rolePermissionCache;
    private DateTime _cacheExpiry = DateTime.MinValue;
    private readonly SemaphoreSlim _cacheLock = new(1, 1);
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public RoleService(IRoleRepository roleRepo, IMapper mapper, ILogger<RoleService> logger)
    {
        _roleRepo = roleRepo;
        _mapper = mapper;
        _logger = logger;
    }

    // ── Cache ───────────────────────────────────────────────────────────

    public async Task<Dictionary<string, HashSet<string>>> GetRolePermissionMapAsync()
    {
        var cache = _rolePermissionCache;
        if (cache != null && DateTime.UtcNow < _cacheExpiry)
            return cache;

        await _cacheLock.WaitAsync();
        try
        {
            // Double-check after acquiring lock
            cache = _rolePermissionCache;
            if (cache != null && DateTime.UtcNow < _cacheExpiry)
                return cache;

            var roles = await _roleRepo.GetAllAsync();

            var map = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
            foreach (var role in roles)
                map[role.Name] = new HashSet<string>(role.Permissions);

            _rolePermissionCache = map;
            _cacheExpiry = DateTime.UtcNow.Add(CacheDuration);

            _logger.LogDebug("Role permission cache refreshed with {Count} roles", map.Count);
            return map;
        }
        finally
        {
            _cacheLock.Release();
        }
    }

    public void InvalidateCache()
    {
        _rolePermissionCache = null;
        _cacheExpiry = DateTime.MinValue;
    }

    // ── Permission resolution ───────────────────────────────────────────

    public async Task<HashSet<string>> GetPermissionsForRolesAsync(IEnumerable<string> roleNames)
    {
        var map = await GetRolePermissionMapAsync();
        var permissions = new HashSet<string>();

        foreach (var role in roleNames)
        {
            if (map.TryGetValue(role, out var rolePerms))
                permissions.UnionWith(rolePerms);
        }

        return permissions;
    }

    public async Task<bool> HasPermissionAsync(IEnumerable<string> roles, string permission)
    {
        var perms = await GetPermissionsForRolesAsync(roles);

        if (perms.Contains("*")) return true;
        if (perms.Contains(permission)) return true;

        // Hierarchy: manage:blog includes manage:blog:own
        var parentPerm = permission.Contains(':') ? permission[..permission.LastIndexOf(':')] : null;
        return parentPerm != null && perms.Contains(parentPerm);
    }

    public async Task<bool> HasAnyPermissionAsync(IEnumerable<string> roles, params string[] permissions)
    {
        var perms = await GetPermissionsForRolesAsync(roles);
        if (perms.Contains("*")) return true;
        foreach (var permission in permissions)
        {
            if (perms.Contains(permission)) return true;
            var parentPerm = permission.Contains(':') ? permission[..permission.LastIndexOf(':')] : null;
            if (parentPerm != null && perms.Contains(parentPerm)) return true;
        }
        return false;
    }

    public async Task<bool> IsValidRoleAsync(string roleName)
    {
        var map = await GetRolePermissionMapAsync();
        return map.ContainsKey(roleName);
    }

    // ── CRUD ────────────────────────────────────────────────────────────

    public async Task<List<RoleResponse>> GetAllAsync()
    {
        var roles = await _roleRepo.GetAllAsync();
        return _mapper.Map<List<RoleResponse>>(roles);
    }

    public async Task<RoleResponse?> GetByIdAsync(string id)
    {
        var doc = await _roleRepo.GetByIdAsync(id);
        return doc != null ? _mapper.Map<RoleResponse>(doc) : null;
    }

    public async Task<RoleResponse> CreateAsync(CreateRoleRequest request)
    {
        // Validate permissions
        foreach (var perm in request.Permissions)
        {
            if (perm == "*")
                throw new InvalidOperationException("The wildcard permission '*' is reserved for MasterAdmin.");

            if (!Permissions.IsValid(perm))
                throw new ArgumentException($"Invalid permission: {perm}");
        }

        var doc = new RoleEntity
        {
            Name = request.Name,
            Slug = GenerateSlug(request.Name),
            Description = request.Description,
            Permissions = request.Permissions,
            IsSystem = false,
        };

        try
        {
            await _roleRepo.InsertAsync(doc);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            throw new ConflictException("A role with this name already exists.");
        }
        InvalidateCache();

        return _mapper.Map<RoleResponse>(doc);
    }

    public async Task<RoleResponse?> UpdateAsync(string id, UpdateRoleRequest request)
    {
        var existing = await _roleRepo.GetByIdAsync(id);
        if (existing == null) return null;

        // MasterAdmin protections
        if (existing.Name == "MasterAdmin")
        {
            if (request.Name != null && request.Name != "MasterAdmin")
                throw new InvalidOperationException("Cannot rename the MasterAdmin role.");

            if (request.Permissions != null && !request.Permissions.Contains("*"))
                throw new InvalidOperationException("Cannot remove wildcard permission from MasterAdmin.");
        }

        // Validate permissions if changing
        if (request.Permissions != null)
        {
            foreach (var perm in request.Permissions)
            {
                if (perm == "*" && existing.Name != "MasterAdmin")
                    throw new InvalidOperationException("The wildcard permission '*' is reserved for MasterAdmin.");

                if (perm != "*" && !Permissions.IsValid(perm))
                    throw new ArgumentException($"Invalid permission: {perm}");
            }
        }

        var updates = new List<UpdateDefinition<RoleEntity>>();

        if (request.Name != null)
        {
            updates.Add(Builders<RoleEntity>.Update.Set(r => r.Name, request.Name));
            updates.Add(Builders<RoleEntity>.Update.Set(r => r.Slug, GenerateSlug(request.Name)));
        }
        if (request.Description != null)
            updates.Add(Builders<RoleEntity>.Update.Set(r => r.Description, request.Description));
        if (request.Permissions != null)
            updates.Add(Builders<RoleEntity>.Update.Set(r => r.Permissions, request.Permissions));

        if (updates.Count == 0) return _mapper.Map<RoleResponse>(existing);

        updates.Add(Builders<RoleEntity>.Update.Set(r => r.UpdatedAt, DateTime.UtcNow));

        var combined = Builders<RoleEntity>.Update.Combine(updates);
        var updated = await _roleRepo.FindOneAndUpdateAsync(id, combined);

        InvalidateCache();
        return updated != null ? _mapper.Map<RoleResponse>(updated) : null;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var existing = await _roleRepo.GetByIdAsync(id);
        if (existing == null) return false;

        if (existing.IsSystem)
            throw new InvalidOperationException($"Cannot delete system role '{existing.Name}'.");

        var result = await _roleRepo.DeleteAsync(id);
        InvalidateCache();

        return result;
    }

    public async Task<List<PublicRoleResponse>> GetPublicRolesAsync()
    {
        var roles = await _roleRepo.GetAllAsync();
        return _mapper.Map<List<PublicRoleResponse>>(roles);
    }

    // ── Seeding ─────────────────────────────────────────────────────────

    public async Task SeedDefaultRolesAsync()
    {
        var count = await _roleRepo.CountAsync();
        if (count > 0) return;

        var defaultRoles = new List<RoleEntity>
        {
            new() { Name = "MasterAdmin", Slug = "masteradmin", Description = "Full system access", Permissions = ["*"], IsSystem = true },
            new() { Name = "Admin", Slug = "admin", Description = "Administrative access", Permissions = ["view:admin", "manage:users", "manage:roles", "manage:blog", "manage:categories", "manage:tags", "manage:case-studies", "manage:pages"], IsSystem = true },
            new() { Name = "Editor", Slug = "editor", Description = "Content editing access", Permissions = ["view:admin", "manage:blog", "manage:case-studies", "manage:categories", "manage:tags"], IsSystem = true },
            new() { Name = "Author", Slug = "author", Description = "Blog authoring access", Permissions = ["view:admin", "manage:blog:own"], IsSystem = true },
            new() { Name = "Member", Slug = "member", Description = "Basic member access", Permissions = ["manage:pages"], IsSystem = true },
            new() { Name = "User", Slug = "user", Description = "Default user role", Permissions = [], IsSystem = true },
            new() { Name = "Owner", Slug = "owner", Description = "Legacy owner role", Permissions = ["view:admin", "manage:users", "manage:roles", "manage:blog", "manage:categories", "manage:tags", "manage:case-studies", "manage:pages"], IsSystem = true },
            new() { Name = "Employee", Slug = "employee", Description = "Legacy employee role", Permissions = ["manage:pages"], IsSystem = true },
            new() { Name = "Individual", Slug = "individual", Description = "Legacy individual role", Permissions = [], IsSystem = true },
        };

        await _roleRepo.InsertManyAsync(defaultRoles);
        InvalidateCache();

        _logger.LogInformation("Seeded {Count} default roles", defaultRoles.Count);
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private static string GenerateSlug(string name)
    {
        var slug = name.ToLowerInvariant().Replace(' ', '-');
        slug = Regex.Replace(slug, @"[^a-z0-9\-]", "");
        return slug;
    }

}
