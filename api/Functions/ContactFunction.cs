using System.Net;
using Api.DTOs.Contact;
using Api.Exceptions;
using Api.Helpers;
using Api.Services;
using FluentValidation;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace Api.Functions;

public class ContactFunction
{
    private readonly IEmailService _emailService;
    private readonly ITurnstileService _turnstileService;
    private readonly IValidator<ContactRequest> _validator;

    public ContactFunction(IEmailService emailService, ITurnstileService turnstileService, IValidator<ContactRequest> validator)
    {
        _emailService = emailService;
        _turnstileService = turnstileService;
        _validator = validator;
    }

    [Function("Contact")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "contact")] HttpRequestData req)
    {
        var body = await FunctionHelper.DeserializeAndValidateAsync<ContactRequest>(req, _validator);

        if (!await _turnstileService.VerifyTokenAsync(body.TurnstileToken, null))
            throw new AppValidationException("turnstile", "Bot verification failed. Please try again.");

        await _emailService.SendContactEmailAsync(body);

        return await req.CreateJsonResponseAsync(HttpStatusCode.OK, new ContactResponse
        {
            Success = true,
            Message = "Your message has been sent. We'll get back to you within 24-48 hours."
        });
    }
}
