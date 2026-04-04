using System.Net;
using System.Text.Json;
using Api.Exceptions;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Logging;

namespace Api.Middleware;

public class ExceptionHandlingMiddleware : IFunctionsWorkerMiddleware
{
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public ExceptionHandlingMiddleware(ILogger<ExceptionHandlingMiddleware> logger)
    {
        _logger = logger;
    }

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception in {Function}", context.FunctionDefinition.Name);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(FunctionContext context, Exception exception)
    {
        var req = await context.GetHttpRequestDataAsync();
        if (req == null) return;

        var (statusCode, body) = exception switch
        {
            NotFoundException ex => (HttpStatusCode.NotFound, new { message = ex.Message }),
            ConflictException ex => (HttpStatusCode.Conflict, new { message = ex.Message }),
            AppValidationException ex => (HttpStatusCode.BadRequest, (object)new { message = ex.Message, errors = ex.Errors }),
            UnauthorizedException ex => (HttpStatusCode.Unauthorized, new { message = ex.Message }),
            ForbiddenException ex => (HttpStatusCode.Forbidden, new { message = ex.Message }),
            InvalidOperationException ex => (HttpStatusCode.BadRequest, new { message = ex.Message }),
            ArgumentException ex => (HttpStatusCode.BadRequest, new { message = ex.Message }),
            _ => (HttpStatusCode.InternalServerError, (object)new { message = "An unexpected error occurred." }),
        };

        var response = req.CreateResponse(statusCode);
        response.Headers.Add("Content-Type", "application/json");
        await response.WriteStringAsync(JsonSerializer.Serialize(body, JsonOptions));
        context.GetInvocationResult().Value = response;
    }
}
