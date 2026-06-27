using System.Net;
using Api.DTOs.Auth;
using Api.Helpers;
using Api.Services.Interfaces;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;

namespace Api.Functions;

public class ProfileFunctions
{
    private readonly ITranslationService _translationService;
    private readonly IConfiguration _config;

    public ProfileFunctions(
        ITranslationService translationService,
        IConfiguration config)
    {
        _translationService = translationService;
        _config = config;
    }

    /// <summary>
    /// Stateless page-translate. The edge authenticates the user, reads their page
    /// content from D1, and POSTs it here with the X-Internal-Auth shared secret.
    /// We translate each requested language and return the translations; the edge
    /// persists them to D1. No Cosmos is touched.
    /// </summary>
    [Function("TranslateUserPage")]
    public async Task<HttpResponseData> TranslateUserPage(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "user/page/translate")] HttpRequestData req)
    {
        InternalAuth.Verify(req, _config);

        var body = await FunctionHelper.DeserializeAndValidateAsync<TranslatePageRequest>(req);

        var translations = new Dictionary<string, PageTranslation>();
        foreach (var lang in body.Languages)
        {
            var translation = await _translationService.TranslateUserPageAsync(body.Bio, body.PageContent, lang);
            translations[lang] = translation;
        }

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { translations });
    }
}
