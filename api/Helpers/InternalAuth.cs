using Api.Exceptions;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;

namespace Api.Helpers;

// Worker→Azure trust boundary. There is no user auth (JWT/roles/permissions) on
// Azure anymore — the Cloudflare Worker authenticates the user/admin and then
// forwards a shared secret (X-Internal-Auth == its SYNC_SECRET, which equals the
// Azure config "ManifestSync:Secret") plus, where needed, the resolved user id
// (X-User-Id). Azure trusts those headers.
public static class InternalAuth
{
    public static void Verify(HttpRequestData req, IConfiguration config)
    {
        var expected = config["ManifestSync:Secret"];
        var provided = req.Headers.TryGetValues("X-Internal-Auth", out var values)
            ? values.FirstOrDefault()
            : null;

        if (string.IsNullOrEmpty(expected) || provided != expected)
            throw new UnauthorizedException();
    }

    public static string RequireUserId(HttpRequestData req)
    {
        var userId = req.Headers.TryGetValues("X-User-Id", out var values)
            ? values.FirstOrDefault()
            : null;

        if (string.IsNullOrEmpty(userId))
            throw new UnauthorizedException("Missing X-User-Id header.");

        return userId;
    }
}
