using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker.Http;

namespace Api.Helpers;

public static class HttpRequestExtensions
{
    public static async Task<HttpResponseData> CreateJsonResponseAsync(
        this HttpRequestData req, HttpStatusCode statusCode, object? body = null)
    {
        var response = req.CreateResponse(statusCode);
        if (body != null)
        {
            response.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await response.WriteStringAsync(JsonSerializer.Serialize(body, SharedJsonOptions.Default));
        }
        return response;
    }
}
