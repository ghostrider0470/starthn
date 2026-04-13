using System.Text.Json;
using Api.Exceptions;
using FluentValidation;
using Microsoft.Azure.Functions.Worker.Http;

namespace Api.Helpers;

public static class FunctionHelper
{
    public static async Task<T> DeserializeAndValidateAsync<T>(
        HttpRequestData req,
        IValidator<T>? validator = null) where T : class
    {
        var body = await req.ReadAsStringAsync();
        if (string.IsNullOrWhiteSpace(body))
            throw new AppValidationException("body", "Request body is required.");

        var result = JsonSerializer.Deserialize<T>(body, SharedJsonOptions.Default);
        if (result == null)
            throw new AppValidationException("body", "Invalid request body.");

        if (validator != null)
        {
            var validationResult = await validator.ValidateAsync(result);
            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Select(e => e.ErrorMessage).ToArray()
                    );
                throw new AppValidationException(errors);
            }
        }

        return result;
    }
}
