using System.Net;
using Api.Exceptions;
using Api.Helpers;
using Api.Services.Interfaces;
using HttpMultipartParser;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace Api.Functions;

public class ImageUploadFunction
{
    private readonly IBlobStorageService _blobService;
    private readonly AuthHelper _auth;

    public ImageUploadFunction(IBlobStorageService blobService, AuthHelper auth)
    {
        _blobService = blobService;
        _auth = auth;
    }

    [Function("AdminUploadBlogImage")]
    public async Task<HttpResponseData> Upload(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "manage/blog/upload-image")] HttpRequestData req)
    {
        await _auth.RequirePermissionAsync(req, "manage:blog");

        var parsed = await MultipartFormDataParser.ParseAsync(req.Body);
        var file = parsed.Files.FirstOrDefault()
            ?? throw new AppValidationException("file", "No image file provided.");

        var url = await _blobService.UploadImageAsync(file.Data, file.FileName, file.ContentType);
        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new { url });
    }
}
