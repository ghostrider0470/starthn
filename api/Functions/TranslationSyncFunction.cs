using System.Net;
using Api.Helpers;
using Api.Repositories.Interfaces;
using Api.Services.Interfaces;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace Api.Functions;

/// <summary>
/// Syncs missing translations for categories and tags (lightweight, runs fast).
/// Blog translations are handled per-post via the translate endpoint.
/// </summary>
public class TranslationSyncFunction
{
    private readonly ICategoryService _categoryService;
    private readonly ITagService _tagService;
    private readonly ITranslationService _translationService;
    private readonly AuthHelper _auth;
    private readonly ILogger<TranslationSyncFunction> _logger;

    private static readonly List<(string localeCode, string translatorCode)> CategoryTagTargets =
    [
        ("af","af"),("am","am"),("ar-SA","ar"),("as","as"),("az","az"),("ba","ba"),("be","be"),
        ("bg","bg"),("bho","bho"),("bn","bn"),("bo","bo"),("brx","brx"),("bs-BA","bs"),("ca","ca"),
        ("cs","cs"),("cy","cy"),("da","da"),("de-DE","de"),("doi","doi"),("dsb","dsb"),("dv","dv"),
        ("el","el"),("es-ES","es"),("et","et"),("eu","eu"),("fa","fa"),("fi","fi"),("fil","fil"),
        ("fj","fj"),("fo","fo"),("fr-FR","fr"),("fr-CA","fr-CA"),("ga","ga"),("gl","gl"),
        ("gom","gom"),("gu","gu"),("ha","ha"),("he","he"),("hi","hi"),("hne","hne"),("hr-HR","hr"),
        ("hsb","hsb"),("ht","ht"),("hu","hu"),("hy","hy"),("id","id"),("ig","ig"),("ikt","ikt"),
        ("is","is"),("it-IT","it"),("iu","iu"),("iu-Latn","iu-Latn"),("ja-JP","ja"),("ka","ka"),
        ("kk","kk"),("km","km"),("kmr","kmr"),("kn","kn"),("ko-KR","ko"),("ks","ks"),("ku","ku"),
        ("ky","ky"),("lb","lb"),("ln","ln"),("lo","lo"),("lt","lt"),("lug","lug"),("lv","lv"),
        ("lzh","lzh"),("mai","mai"),("mg","mg"),("mi","mi"),("mk","mk"),("ml","ml"),
        ("mn-Cyrl","mn-Cyrl"),("mn-Mong","mn-Mong"),("mni","mni"),("mr","mr"),("ms","ms"),
        ("mt","mt"),("mww","mww"),("my","my"),("nb","nb"),("ne","ne"),("nl-NL","nl"),
        ("nso","nso"),("nya","nya"),("or","or"),("otq","otq"),("pa","pa"),("pl","pl"),
        ("prs","prs"),("ps","ps"),("pt-BR","pt"),("pt-PT","pt-PT"),("ro","ro"),("ru-RU","ru"),
        ("run","run"),("rw","rw"),("sd","sd"),("si","si"),("sk","sk"),("sl","sl"),("sm","sm"),
        ("sn","sn"),("so","so"),("sq","sq"),("sr-Cyrl","sr-Cyrl"),("sr-Latn","sr-Latn"),
        ("st","st"),("sv","sv"),("sw","sw"),("ta","ta"),("te","te"),("th","th"),("ti","ti"),
        ("tk","tk"),("tlh-Latn","tlh-Latn"),("tlh-Piqd","tlh-Piqd"),("tn","tn"),("to","to"),
        ("tr-TR","tr"),("tt","tt"),("ty","ty"),("ug","ug"),("uk","uk"),("ur","ur"),("uz","uz"),
        ("vi","vi"),("xh","xh"),("yo","yo"),("yua","yua"),("yue","yue"),("zh-Hans","zh-Hans"),
        ("zh-Hant","zh-Hant"),("zu","zu")
    ];

    public TranslationSyncFunction(
        ICategoryService categoryService, ITagService tagService,
        ITranslationService translationService, AuthHelper auth,
        ILogger<TranslationSyncFunction> logger)
    {
        _categoryService = categoryService;
        _tagService = tagService;
        _translationService = translationService;
        _auth = auth;
        _logger = logger;
    }

    [Function("TranslationSync")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/translation-sync")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "manage:blog");

        var categoryCount = 0;
        var tagCount = 0;

        var categories = await _categoryService.GetAllAsync();
        foreach (var cat in categories)
        {
            var missing = CategoryTagTargets.Where(t => !cat.Translations.ContainsKey(t.localeCode)).ToList();
            if (missing.Count == 0) continue;
            try
            {
                await _categoryService.TranslateAsync(cat.Id, missing, _translationService);
                categoryCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to translate category '{Label}'", cat.Label);
            }
        }

        var tags = await _tagService.GetAllAsync();
        foreach (var tag in tags)
        {
            var missing = CategoryTagTargets.Where(t => !tag.Translations.ContainsKey(t.localeCode)).ToList();
            if (missing.Count == 0) continue;
            try
            {
                await _tagService.TranslateAsync(tag.Id, missing, _translationService);
                tagCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to translate tag '{Label}'", tag.Label);
            }
        }

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new
        {
            message = "Translation sync completed.",
            categoriesTranslated = categoryCount,
            tagsTranslated = tagCount,
        });
    }
}
