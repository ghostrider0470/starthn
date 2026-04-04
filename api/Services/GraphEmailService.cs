using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Api.DTOs.Contact;
using Azure.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Api.Services;

public class GraphEmailService : IEmailService
{
    private readonly HttpClient _httpClient;
    private readonly ClientSecretCredential _credential;
    private readonly string _mailFrom;
    private readonly string _mailTo;
    private readonly ILogger<GraphEmailService> _logger;

    public GraphEmailService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<GraphEmailService> logger)
    {
        _httpClient = httpClient;
        _mailFrom = configuration["MAIL_FROM"]
            ?? throw new InvalidOperationException("MAIL_FROM is not configured.");
        _mailTo = configuration["MAIL_TO"]
            ?? throw new InvalidOperationException("MAIL_TO is not configured.");
        _logger = logger;

        _credential = new ClientSecretCredential(
            configuration["AZURE_TENANT_ID"],
            configuration["AZURE_CLIENT_ID"],
            configuration["AZURE_CLIENT_SECRET"]);
    }

    public async Task SendContactEmailAsync(ContactRequest request)
    {
        var subjectMap = new Dictionary<string, string>
        {
            ["project"] = "New Project",
            ["support"] = "Technical Support",
            ["partnerships"] = "Partnerships",
            ["careers"] = "Careers",
            ["general"] = "General Inquiry"
        };

        var subjectLabel = subjectMap.GetValueOrDefault(request.Subject, request.Subject);
        var emailSubject = $"[Contact Form] {subjectLabel} — {request.Name}";

        var companyLine = string.IsNullOrWhiteSpace(request.Company)
            ? ""
            : $" from {System.Net.WebUtility.HtmlEncode(request.Company)}";

        var messageBody = request.IsHtml
            ? request.Message
            : $"<p>{System.Net.WebUtility.HtmlEncode(request.Message)}</p>";

        var htmlBody = $"""
            {messageBody}
            <br>
            <p>Best regards,<br>
            {System.Net.WebUtility.HtmlEncode(request.Name)}{companyLine}<br>
            <a href="mailto:{System.Net.WebUtility.HtmlEncode(request.Email)}">{System.Net.WebUtility.HtmlEncode(request.Email)}</a></p>
            <br>
            <hr style="border: none; border-top: 1px solid #ccc;">
            <p style="color: #888; font-size: 12px;">Sent via horizon-tech.io contact form &middot; Category: {System.Net.WebUtility.HtmlEncode(subjectLabel)}</p>
            """;

        var payload = new
        {
            message = new
            {
                subject = emailSubject,
                body = new { contentType = "HTML", content = htmlBody },
                toRecipients = new[] { new { emailAddress = new { address = _mailTo } } },
                replyTo = new[] { new { emailAddress = new { address = request.Email, name = request.Name } } }
            },
            saveToSentItems = true
        };

        var token = await _credential.GetTokenAsync(
            new Azure.Core.TokenRequestContext(["https://graph.microsoft.com/.default"]));

        var jsonContent = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json");

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post,
            $"https://graph.microsoft.com/v1.0/users/{Uri.EscapeDataString(_mailFrom)}/sendMail");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.Token);
        httpRequest.Content = jsonContent;

        _logger.LogInformation("Sending contact email from {Name} ({Email}), subject: {Subject}",
            request.Name, request.Email, subjectLabel);

        var response = await _httpClient.SendAsync(httpRequest);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            _logger.LogError("Graph API error {StatusCode}: {Body}", response.StatusCode, errorBody);
            throw new InvalidOperationException($"Graph API returned {response.StatusCode}");
        }

        _logger.LogInformation("Contact email sent successfully.");
    }
}
