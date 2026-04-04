using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Api.DTOs.Chat;
using Api.DTOs.Contact;
using Api.Helpers;
using Api.Services;
using Api.Services.Interfaces;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace Api.Functions;

public class ChatFunction
{
    private readonly IChatService _chatService;
    private readonly ITurnstileService _turnstileService;
    private readonly IEmailService _emailService;
    private readonly ILogger<ChatFunction> _logger;
    private static readonly RateLimiter _rateLimiter = new(50, TimeSpan.FromHours(1));
    private static readonly HashSet<string> _verifiedSessions = new();
    private static readonly HashSet<string> _notifiedSessions = new();
    private static readonly object _sessionLock = new();

    private static readonly Regex EmailRegex = new(
        @"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
        RegexOptions.Compiled);

    public ChatFunction(
        IChatService chatService,
        ITurnstileService turnstileService,
        IEmailService emailService,
        ILogger<ChatFunction> logger)
    {
        _chatService = chatService;
        _turnstileService = turnstileService;
        _emailService = emailService;
        _logger = logger;
    }

    [Function("Chat")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "chat")] HttpRequestData req)
    {
        var clientIp = req.Headers.TryGetValues("X-Forwarded-For", out var fwdValues)
            ? fwdValues.FirstOrDefault()
            : req.Headers.TryGetValues("REMOTE_ADDR", out var remoteValues)
                ? remoteValues.FirstOrDefault()
                : "unknown";

        if (!_rateLimiter.IsAllowed(clientIp ?? "unknown"))
        {
            var tooMany = req.CreateResponse(HttpStatusCode.TooManyRequests);
            tooMany.Headers.Add("Retry-After", "60");
            await tooMany.WriteStringAsync("Rate limit exceeded. Try again later.");
            return tooMany;
        }

        var body = await req.ReadAsStringAsync();
        if (string.IsNullOrWhiteSpace(body))
            return await req.CreateJsonResponseAsync(HttpStatusCode.BadRequest, new { error = "Request body is required." });

        var chatRequest = JsonSerializer.Deserialize<ChatRequest>(body, SharedJsonOptions.Default);
        if (chatRequest == null || chatRequest.Messages.Count == 0)
            return await req.CreateJsonResponseAsync(HttpStatusCode.BadRequest, new { error = "Messages array is required." });

        bool needsVerification;
        lock (_sessionLock)
        {
            needsVerification = !_verifiedSessions.Contains(chatRequest.SessionId);
        }

        if (needsVerification && !string.IsNullOrEmpty(chatRequest.TurnstileToken))
        {
            if (!await _turnstileService.VerifyTokenAsync(chatRequest.TurnstileToken, clientIp))
                return await req.CreateJsonResponseAsync(HttpStatusCode.Forbidden, new { error = "Bot verification failed." });
        }

        if (needsVerification)
        {
            lock (_sessionLock)
            {
                _verifiedSessions.Add(chatRequest.SessionId);
            }
        }

        var response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "text/event-stream");
        response.Headers.Add("Cache-Control", "no-cache");

        var cts = new CancellationTokenSource(TimeSpan.FromMinutes(2));

        try
        {
            await foreach (var token in _chatService.StreamResponseAsync(chatRequest.Messages, chatRequest.Locale, chatRequest.PageContext, cts.Token))
            {
                var chunk = $"data: {JsonSerializer.Serialize(new { content = token, done = false })}\n\n";
                await response.WriteStringAsync(chunk);
            }

            await response.WriteStringAsync($"data: {JsonSerializer.Serialize(new { content = "", done = true })}\n\n");
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Chat stream timed out for session {SessionId}", chatRequest.SessionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Chat stream error for session {SessionId}", chatRequest.SessionId);
            await response.WriteStringAsync($"data: {JsonSerializer.Serialize(new { content = "Sorry, something went wrong.", done = true })}\n\n");
        }

        // Fire-and-forget: check for lead info and send notification
        _ = Task.Run(() => TryNotifyLeadAsync(chatRequest));

        return response;
    }

    private async Task TryNotifyLeadAsync(ChatRequest chatRequest)
    {
        try
        {
            lock (_sessionLock)
            {
                if (_notifiedSessions.Contains(chatRequest.SessionId))
                    return;
            }

            var allUserText = string.Join(" ", chatRequest.Messages
                .Where(m => m.Role == "user")
                .Select(m => m.Content));

            var emailMatch = EmailRegex.Match(allUserText);
            if (!emailMatch.Success) return;

            var userEmail = emailMatch.Value;

            lock (_sessionLock)
            {
                _notifiedSessions.Add(chatRequest.SessionId);
            }

            _logger.LogInformation("Chat lead detected: {Email} (session {SessionId})", userEmail, chatRequest.SessionId);

            // Ask the LLM to summarize the conversation for the sales team
            var summary = await GenerateLeadSummaryAsync(chatRequest.Messages);

            await _emailService.SendContactEmailAsync(new ContactRequest
            {
                Name = "Chat Lead",
                Email = userEmail,
                Subject = "project",
                Message = summary,
                IsHtml = true,
            });

            _logger.LogInformation("Chat lead notification sent for {Email}", userEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send chat lead notification for session {SessionId}", chatRequest.SessionId);
        }
    }

    private async Task<string> GenerateLeadSummaryAsync(List<ChatMessageDto> messages)
    {
        var conversation = string.Join("\n", messages.Select(m => $"[{m.Role}]: {m.Content}"));

        var summaryMessages = new List<ChatMessageDto>
        {
            new()
            {
                Role = "user",
                Content = $"""
                    You are an internal assistant at Horizon Tech. Summarize this chatbot conversation into a lead notification email for the sales team.

                    Output ONLY valid HTML (no markdown). Use <h3>, <ul><li>, <p>, <strong> tags.

                    Structure:
                    <h3>Lead Summary</h3>
                    <ul>
                      <li><strong>Contact:</strong> name, email, company</li>
                      <li><strong>Looking for:</strong> project type, technologies, timeline</li>
                      <li><strong>Budget:</strong> range if mentioned, or "Not discussed"</li>
                      <li><strong>Pain points:</strong> key requirements</li>
                    </ul>
                    <h3>Recommended Next Steps</h3>
                    <ul><li>...</li></ul>

                    Be concise and actionable. No greeting or sign-off.

                    Conversation:
                    {conversation}
                    """
            }
        };

        var result = new System.Text.StringBuilder();
        await foreach (var token in _chatService.StreamResponseAsync(summaryMessages))
        {
            result.Append(token);
        }

        var summary = result.ToString().Trim();

        // Strip markdown code fences if the LLM wraps in ```html
        summary = Regex.Replace(summary, @"^```(?:html)?\s*", "", RegexOptions.Multiline);
        summary = Regex.Replace(summary, @"\s*```\s*$", "", RegexOptions.Multiline);

        return string.IsNullOrEmpty(summary)
            ? $"<p>Lead captured via chatbot.</p><pre>{System.Net.WebUtility.HtmlEncode(conversation)}</pre>"
            : summary;
    }
}
