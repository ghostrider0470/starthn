namespace Api.Configuration;

public static class Permissions
{
    public static readonly string[] All =
    [
        "view:admin",
        "manage:users",
        "manage:roles",
        "manage:blog",
        "manage:blog:own",
        "manage:categories",
        "manage:tags",
        "manage:case-studies",
        "manage:pages",
    ];

    public static readonly Dictionary<string, string[]> Groups = new()
    {
        ["Admin Access"] = ["view:admin"],
        ["User Management"] = ["manage:users", "manage:roles"],
        ["Blog"] = ["manage:blog", "manage:blog:own"],
        ["Taxonomy"] = ["manage:categories", "manage:tags"],
        ["Content"] = ["manage:case-studies", "manage:pages"],
    };

    public static bool IsValid(string permission) => All.Contains(permission);
}
