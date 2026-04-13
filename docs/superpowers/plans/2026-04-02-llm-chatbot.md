# LLM Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an LLM-powered chatbot with a floating widget on all pages and an inline chat section on the landing page, backed by Azure OpenAI with NVIDIA fallback.

**Architecture:** C# Azure Function streams SSE from a 3-tier LLM provider (admin DB → env var Azure OpenAI → NVIDIA fallback). React frontend uses a shared `ChatProvider` context with `useChatStream` hook that parses SSE via `ReadableStream`. Two surfaces share state: floating widget + landing page inline section.

**Tech Stack:** Azure Functions (.NET 8 isolated), React 19, TanStack Router, Tailwind CSS, i18next

**Spec:** `docs/superpowers/specs/2026-04-02-llm-chatbot-design.md`

---

## File Map

### Backend (C#)

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `api/Functions/ChatFunction.cs` | HTTP endpoint, rate limiting, Turnstile, orchestration |
| Create | `api/Services/Implementations/ChatService.cs` | LLM provider resolution (3-tier), streaming proxy, system prompt |
| Create | `api/Services/Interfaces/IChatService.cs` | Interface for chat service |
| Create | `api/DTOs/Chat/ChatRequest.cs` | Request DTO |
| Create | `api/DTOs/Chat/ChatMessage.cs` | Message DTO (role + content) |
| Create | `api/Helpers/RateLimiter.cs` | In-memory sliding window rate limiter |
| Modify | `api/Entities/LlmSettingsEntity.cs` | Add `chatProviderKey` + `chatModelId` fields |
| Modify | `api/Program.cs` | Register `IChatService` |

### Frontend (React/TypeScript)

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/contexts/ChatContext.tsx` | ChatProvider context + `useChatStream` hook |
| Create | `src/components/chat/ChatWidget.tsx` | Floating bubble + slide-up panel |
| Create | `src/components/chat/ChatPanel.tsx` | Shared chat UI (messages, input, streaming) |
| Create | `src/components/chat/ChatMessage.tsx` | Single message bubble component |
| Create | `src/components/landing/ChatSection.tsx` | Landing page inline chat section |
| Modify | `src/routes/__root.tsx` | Mount ChatProvider + ChatWidget |
| Modify | `src/routes/{-$locale}/index.tsx` | Add ChatSection between FAQ and footer |
| Modify | `src/env.ts` | Add `VITE_FEATURE_CHAT` |
| Modify | `src/lib/feature-flags.ts` | Add `chat` flag |

---

## Task 1: Rate Limiter Utility

**Files:**
- Create: `api/Helpers/RateLimiter.cs`

- [ ] **Step 1: Create RateLimiter.cs**

```csharp
using System.Collections.Concurrent;

namespace Api.Helpers;

public class RateLimiter
{
    private readonly ConcurrentDictionary<string, List<DateTime>> _requests = new();
    private readonly int _maxRequests;
    private readonly TimeSpan _window;

    public RateLimiter(int maxRequests, TimeSpan window)
    {
        _maxRequests = maxRequests;
        _window = window;
    }

    public bool IsAllowed(string key)
    {
        var now = DateTime.UtcNow;
        var cutoff = now - _window;

        var timestamps = _requests.GetOrAdd(key, _ => new List<DateTime>());

        lock (timestamps)
        {
            timestamps.RemoveAll(t => t < cutoff);

            if (timestamps.Count >= _maxRequests)
                return false;

            timestamps.Add(now);
            return true;
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/Helpers/RateLimiter.cs
git commit -m "feat(chat): add in-memory sliding window rate limiter"
```

---

## Task 2: Chat DTOs

**Files:**
- Create: `api/DTOs/Chat/ChatMessage.cs`
- Create: `api/DTOs/Chat/ChatRequest.cs`

- [ ] **Step 1: Create ChatMessage.cs**

```csharp
using System.Text.Json.Serialization;

namespace Api.DTOs.Chat;

public class ChatMessageDto
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = "user";

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
}
```

- [ ] **Step 2: Create ChatRequest.cs**

```csharp
using System.Text.Json.Serialization;

namespace Api.DTOs.Chat;

public class ChatRequest
{
    [JsonPropertyName("messages")]
    public List<ChatMessageDto> Messages { get; set; } = [];

    [JsonPropertyName("sessionId")]
    public string SessionId { get; set; } = string.Empty;

    [JsonPropertyName("turnstileToken")]
    public string? TurnstileToken { get; set; }
}
```

- [ ] **Step 3: Commit**

```bash
git add api/DTOs/Chat/
git commit -m "feat(chat): add chat request/message DTOs"
```

---

## Task 3: LLM Settings Schema Update

**Files:**
- Modify: `api/Entities/LlmSettingsEntity.cs`

- [ ] **Step 1: Add chat provider fields**

Add after the `Concurrency` property:

```csharp
[BsonElement("chatProviderKey")]
public string? ChatProviderKey { get; set; }

[BsonElement("chatModelId")]
public string? ChatModelId { get; set; }
```

- [ ] **Step 2: Commit**

```bash
git add api/Entities/LlmSettingsEntity.cs
git commit -m "feat(chat): add chatProviderKey/chatModelId to LlmSettings"
```

---

## Task 4: Chat Service (Backend Core)

**Files:**
- Create: `api/Services/Interfaces/IChatService.cs`
- Create: `api/Services/Implementations/ChatService.cs`

- [ ] **Step 1: Create IChatService.cs**

```csharp
using Api.DTOs.Chat;

namespace Api.Services.Interfaces;

public interface IChatService
{
    IAsyncEnumerable<string> StreamResponseAsync(List<ChatMessageDto> messages, CancellationToken cancellationToken = default);
}
```

- [ ] **Step 2: Create ChatService.cs**

```csharp
using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using Api.DTOs.Chat;
using Api.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Api.Services.Implementations;

public class ChatService : IChatService
{
    private readonly HttpClient _http;
    private readonly ILlmProviderService _providerService;
    private readonly ILogger<ChatService> _logger;

    private const string SystemPrompt = """
        You are a friendly tech expert working at Horizon Tech, an EU-based software consultancy headquartered in Sarajevo, Bosnia and Herzegovina.

        About Horizon Tech:
        - Services: Enterprise Software Development, AI/ML & Business Intelligence, Cloud Architecture, IoT & Edge Computing, DevOps & Platform Engineering, Digital Transformation
        - Tech stack: .NET, C#, React, TypeScript, Node.js, Python, Azure, AWS, Kubernetes, Docker, Terraform, PostgreSQL, MongoDB, and more
        - Team: 25+ engineers across 9+ countries, remote-first, CET timezone
        - Engagement model: Dedicated teams embedded in your workflow — not body-shopping. No account managers or ticket queues.
        - Website: https://www.horizon-tech.io

        Your personality:
        - Friendly, conversational, knowledgeable — like chatting with a senior engineer
        - Not salesy or pushy. Be helpful and honest.
        - Answer in the same language the user writes in
        - Keep responses concise (2-4 sentences unless they ask for detail)

        Lead capture:
        - When the user describes a concrete project need, budget, or timeline, naturally ask for their name and email so the team can follow up
        - If they decline, suggest visiting /contact instead
        - Never push or ask more than once per conversation
        """;

    public ChatService(HttpClient http, ILlmProviderService providerService, ILogger<ChatService> logger)
    {
        _http = http;
        _providerService = providerService;
        _logger = logger;
    }

    public async IAsyncEnumerable<string> StreamResponseAsync(
        List<ChatMessageDto> messages,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        // Build full message list with system prompt
        var fullMessages = new List<object>
        {
            new { role = "system", content = SystemPrompt }
        };
        fullMessages.AddRange(messages.TakeLast(20).Select(m => new { role = m.Role, content = m.Content }));

        // Try providers in order: DB → env vars → NVIDIA
        var stream = await TryDbProviderAsync(fullMessages, cancellationToken)
            ?? await TryEnvProviderAsync(fullMessages, cancellationToken)
            ?? await TryNvidiaFallbackAsync(fullMessages, cancellationToken);

        if (stream == null)
        {
            yield return "I'm temporarily unavailable. Please try again later or visit our contact page at /contact.";
            yield break;
        }

        using var reader = new StreamReader(stream);
        while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (line == null) break;
            if (!line.StartsWith("data: ")) continue;

            var data = line["data: ".Length..];
            if (data == "[DONE]") break;

            try
            {
                using var doc = JsonDocument.Parse(data);
                var delta = doc.RootElement
                    .GetProperty("choices")[0]
                    .GetProperty("delta");

                if (delta.TryGetProperty("content", out var content) && content.GetString() is { } text)
                {
                    yield return text;
                }
            }
            catch { /* skip malformed chunks */ }
        }
    }

    private async Task<Stream?> TryDbProviderAsync(List<object> messages, CancellationToken ct)
    {
        try
        {
            var settings = await _providerService.GetSettingsAsync();
            if (string.IsNullOrEmpty(settings.ChatProviderKey) || string.IsNullOrEmpty(settings.ChatModelId))
                return null;

            var providers = await _providerService.GetAllAsync();
            var provider = providers.FirstOrDefault(p => p.Key == settings.ChatProviderKey && p.IsEnabled);
            if (provider == null) return null;

            var model = provider.Models.FirstOrDefault(m => m.Id == settings.ChatModelId);
            if (model == null) return null;

            var apiType = model.Api ?? provider.Api;
            _logger.LogInformation("Chat: using DB provider {Key}/{Model} ({Api})", provider.Key, model.Id, apiType);

            return apiType == "anthropic-messages"
                ? await StreamAnthropicAsync(provider.BaseUrl, provider.ApiKey, model.Id, model.MaxTokens, provider.Headers, messages, ct)
                : await StreamOpenAiCompatibleAsync(provider.BaseUrl, provider.ApiKey, model.Id, provider.Headers, messages, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Chat: DB provider failed, trying env fallback");
            return null;
        }
    }

    private async Task<Stream?> TryEnvProviderAsync(List<object> messages, CancellationToken ct)
    {
        var endpoint = Environment.GetEnvironmentVariable("CHAT_LLM_ENDPOINT");
        var deployment = Environment.GetEnvironmentVariable("CHAT_LLM_DEPLOYMENT");
        var apiKey = Environment.GetEnvironmentVariable("CHAT_LLM_API_KEY");

        if (string.IsNullOrEmpty(endpoint) || string.IsNullOrEmpty(deployment) || string.IsNullOrEmpty(apiKey))
            return null;

        try
        {
            _logger.LogInformation("Chat: using env Azure OpenAI ({Deployment})", deployment);
            var url = $"{endpoint.TrimEnd('/')}/openai/deployments/{deployment}/chat/completions?api-version=2024-10-21";

            var body = new { messages, stream = true };
            var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
            };
            request.Headers.Add("api-key", apiKey);

            var response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStreamAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Chat: env Azure OpenAI failed, trying NVIDIA fallback");
            return null;
        }
    }

    private async Task<Stream?> TryNvidiaFallbackAsync(List<object> messages, CancellationToken ct)
    {
        var apiKey = Environment.GetEnvironmentVariable("NVIDIA_API_KEY");
        if (string.IsNullOrEmpty(apiKey)) return null;

        try
        {
            _logger.LogInformation("Chat: using NVIDIA fallback");
            var url = "https://integrate.api.nvidia.com/v1/chat/completions";
            var body = new
            {
                model = "z-ai/glm5",
                messages,
                stream = true,
                temperature = 1,
                top_p = 1,
                max_tokens = 16384,
            };

            var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStreamAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Chat: NVIDIA fallback also failed");
            return null;
        }
    }

    private async Task<Stream?> StreamAnthropicAsync(
        string baseUrl, string apiKey, string model, int maxTokens,
        Dictionary<string, string> headers, List<object> messages, CancellationToken ct)
    {
        var msgPath = baseUrl.TrimEnd('/').EndsWith("/v1", StringComparison.OrdinalIgnoreCase)
            ? $"{baseUrl.TrimEnd('/')}/messages"
            : $"{baseUrl.TrimEnd('/')}/v1/messages";

        // Extract system message, Anthropic uses a separate field
        var systemMsg = messages.FirstOrDefault()?.GetType().GetProperty("content")?.GetValue(messages[0]) as string ?? "";
        var userMessages = messages.Skip(1).ToList();

        var body = new
        {
            model,
            max_tokens = maxTokens,
            system = systemMsg,
            messages = userMessages,
            stream = true,
        };

        var request = new HttpRequestMessage(HttpMethod.Post, msgPath)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
        };
        request.Headers.Add("x-api-key", apiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");
        foreach (var (k, v) in headers)
            if (k != "anthropic-version") request.Headers.TryAddWithoutValidation(k, v);

        var response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStreamAsync(ct);
    }

    private async Task<Stream?> StreamOpenAiCompatibleAsync(
        string baseUrl, string apiKey, string model,
        Dictionary<string, string> headers, List<object> messages, CancellationToken ct)
    {
        var chatPath = baseUrl.TrimEnd('/').EndsWith("/v1", StringComparison.OrdinalIgnoreCase)
            ? $"{baseUrl.TrimEnd('/')}/chat/completions"
            : $"{baseUrl.TrimEnd('/')}/v1/chat/completions";

        var body = new { model, messages, stream = true };

        var request = new HttpRequestMessage(HttpMethod.Post, chatPath)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        foreach (var (k, v) in headers)
            request.Headers.TryAddWithoutValidation(k, v);

        var response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStreamAsync(ct);
    }
}
```

- [ ] **Step 3: Register in Program.cs**

Add after the existing LLM service registrations:

```csharp
// Chat
builder.Services.AddHttpClient<IChatService, ChatService>();
```

- [ ] **Step 4: Commit**

```bash
git add api/Services/Interfaces/IChatService.cs api/Services/Implementations/ChatService.cs api/Program.cs
git commit -m "feat(chat): add ChatService with 3-tier LLM provider fallback and streaming"
```

---

## Task 5: Chat Azure Function

**Files:**
- Create: `api/Functions/ChatFunction.cs`

- [ ] **Step 1: Create ChatFunction.cs**

```csharp
using System.Net;
using System.Text;
using System.Text.Json;
using Api.DTOs.Chat;
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
    private readonly ILogger<ChatFunction> _logger;
    private static readonly RateLimiter _rateLimiter = new(50, TimeSpan.FromHours(1));
    private static readonly HashSet<string> _verifiedSessions = new();
    private static readonly object _sessionLock = new();

    public ChatFunction(IChatService chatService, ITurnstileService turnstileService, ILogger<ChatFunction> logger)
    {
        _chatService = chatService;
        _turnstileService = turnstileService;
        _logger = logger;
    }

    [Function("Chat")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "chat")] HttpRequestData req)
    {
        // Rate limit by IP
        var clientIp = req.Headers.GetValues("X-Forwarded-For").FirstOrDefault()
            ?? req.Headers.GetValues("REMOTE_ADDR").FirstOrDefault()
            ?? "unknown";

        if (!_rateLimiter.IsAllowed(clientIp))
        {
            var tooMany = req.CreateResponse(HttpStatusCode.TooManyRequests);
            tooMany.Headers.Add("Retry-After", "60");
            await tooMany.WriteStringAsync("Rate limit exceeded. Try again later.");
            return tooMany;
        }

        // Parse request
        var body = await req.ReadAsStringAsync();
        if (string.IsNullOrWhiteSpace(body))
        {
            return await req.CreateJsonResponseAsync(HttpStatusCode.BadRequest, new { error = "Request body is required." });
        }

        var chatRequest = JsonSerializer.Deserialize<ChatRequest>(body, SharedJsonOptions.Default);
        if (chatRequest == null || chatRequest.Messages.Count == 0)
        {
            return await req.CreateJsonResponseAsync(HttpStatusCode.BadRequest, new { error = "Messages array is required." });
        }

        // Turnstile verification (first message per session only)
        bool needsVerification;
        lock (_sessionLock)
        {
            needsVerification = !_verifiedSessions.Contains(chatRequest.SessionId);
        }

        if (needsVerification)
        {
            if (string.IsNullOrEmpty(chatRequest.TurnstileToken))
            {
                return await req.CreateJsonResponseAsync(HttpStatusCode.BadRequest, new { error = "Turnstile token required for first message." });
            }

            if (!await _turnstileService.VerifyTokenAsync(chatRequest.TurnstileToken, clientIp))
            {
                return await req.CreateJsonResponseAsync(HttpStatusCode.Forbidden, new { error = "Bot verification failed." });
            }

            lock (_sessionLock)
            {
                _verifiedSessions.Add(chatRequest.SessionId);
            }
        }

        // Stream SSE response
        var response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "text/event-stream");
        response.Headers.Add("Cache-Control", "no-cache");
        response.Headers.Add("Connection", "keep-alive");

        var cts = new CancellationTokenSource(TimeSpan.FromMinutes(2));

        try
        {
            await foreach (var token in _chatService.StreamResponseAsync(chatRequest.Messages, cts.Token))
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
            await response.WriteStringAsync($"data: {JsonSerializer.Serialize(new { content = "Sorry, something went wrong. Please try again.", done = true })}\n\n");
        }

        return response;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/Functions/ChatFunction.cs
git commit -m "feat(chat): add ChatFunction with SSE streaming, rate limiting, Turnstile"
```

---

## Task 6: Feature Flag + Env Setup

**Files:**
- Modify: `src/env.ts`
- Modify: `src/lib/feature-flags.ts`

- [ ] **Step 1: Add VITE_FEATURE_CHAT to env.ts**

Add to the `client` object:

```typescript
VITE_FEATURE_CHAT: z.string().optional(),
```

- [ ] **Step 2: Add chat flag to feature-flags.ts**

```typescript
chat: env.VITE_FEATURE_CHAT === 'true',
```

- [ ] **Step 3: Add to .env**

```
VITE_FEATURE_CHAT=true
```

- [ ] **Step 4: Commit**

```bash
git add src/env.ts src/lib/feature-flags.ts
git commit -m "feat(chat): add VITE_FEATURE_CHAT feature flag"
```

---

## Task 7: Chat Context + useChatStream Hook

**Files:**
- Create: `src/contexts/ChatContext.tsx`

- [ ] **Step 1: Create ChatContext.tsx**

```tsx
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatContextValue {
  messages: ChatMessage[]
  send: (content: string) => void
  isStreaming: boolean
  error: string | null
  clearMessages: () => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

const STORAGE_KEY = 'ht-chat-messages'
const SESSION_KEY = 'ht-chat-session'

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

function loadMessages(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ChatMessage[]) : []
  } catch {
    return []
  }
}

function saveMessages(messages: ChatMessage[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const turnstileVerified = useRef(false)

  // Persist messages to sessionStorage
  useEffect(() => {
    saveMessages(messages)
  }, [messages])

  const send = useCallback(async (content: string) => {
    if (isStreaming || !content.trim()) return

    const userMessage: ChatMessage = { role: 'user', content: content.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setIsStreaming(true)
    setError(null)

    // Add empty assistant message for streaming
    const withAssistant = [...updatedMessages, { role: 'assistant' as const, content: '' }]
    setMessages(withAssistant)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      // Get Turnstile token for first message
      let turnstileToken: string | undefined
      if (!turnstileVerified.current && window.turnstile) {
        try {
          turnstileToken = await new Promise<string>((resolve, reject) => {
            window.turnstile.render('#chat-turnstile', {
              sitekey: '0x4AAAAAACZzTkGBs3LJbEAG',
              callback: resolve,
              'error-callback': reject,
              size: 'invisible',
            })
          })
          turnstileVerified.current = true
        } catch {
          // Continue without token — server will reject if needed
        }
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          sessionId: getSessionId(),
          turnstileToken,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''
      let assistantContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data) as { content: string; done: boolean }
            if (parsed.content) {
              assistantContent += parsed.content
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
                return updated
              })
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message)
        // Remove empty assistant message on error
        setMessages(prev => prev.filter(m => m.content !== '' || m.role !== 'assistant'))
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [messages, isStreaming])

  const clearMessages = useCallback(() => {
    setMessages([])
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    turnstileVerified.current = false
  }, [])

  return (
    <ChatContext.Provider value={{ messages, send, isStreaming, error, clearMessages, isOpen, setIsOpen }}>
      {children}
      {/* Invisible Turnstile container */}
      <div id="chat-turnstile" style={{ display: 'none' }} />
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
```

- [ ] **Step 2: Add Turnstile type declaration**

Create or add to `src/types/global.d.ts`:

```typescript
interface Window {
  turnstile?: {
    render: (container: string, options: {
      sitekey: string
      callback: (token: string) => void
      'error-callback'?: (error: unknown) => void
      size?: 'invisible' | 'normal' | 'compact'
    }) => string
    remove: (widgetId: string) => void
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/contexts/ChatContext.tsx src/types/global.d.ts
git commit -m "feat(chat): add ChatProvider context with SSE streaming hook"
```

---

## Task 8: ChatMessage Component

**Files:**
- Create: `src/components/chat/ChatMessage.tsx`

- [ ] **Step 1: Create ChatMessage.tsx**

```tsx
import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType } from '@/contexts/ChatContext'

interface ChatMessageProps {
  message: ChatMessageType
  isStreaming?: boolean
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md',
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {message.content}
          {isStreaming && !isUser && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary/70" />
          )}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/chat/ChatMessage.tsx
git commit -m "feat(chat): add ChatMessage bubble component"
```

---

## Task 9: ChatPanel Component (Shared UI)

**Files:**
- Create: `src/components/chat/ChatPanel.tsx`

- [ ] **Step 1: Create ChatPanel.tsx**

```tsx
import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import { ChatMessage } from './ChatMessage'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ChatPanelProps {
  className?: string
  height?: string
}

export function ChatPanel({ className, height = 'h-[400px]' }: ChatPanelProps) {
  const { messages, send, isStreaming, error } = useChat()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || isStreaming) return
    send(input)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Messages */}
      <div ref={scrollRef} className={cn('flex-1 space-y-3 overflow-y-auto p-4', height)}>
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground pt-8">
            Ask us anything about our services, tech stack, or how we work.
          </p>
        )}
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            message={msg}
            isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}
        {error && (
          <p className="text-center text-xs text-destructive">{error}</p>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isStreaming}
            className={cn(
              'flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20',
              'disabled:opacity-50',
            )}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="h-9 w-9 shrink-0 rounded-lg"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/chat/ChatPanel.tsx
git commit -m "feat(chat): add ChatPanel with messages, input, auto-scroll"
```

---

## Task 10: ChatWidget (Floating Bubble + Panel)

**Files:**
- Create: `src/components/chat/ChatWidget.tsx`

- [ ] **Step 1: Create ChatWidget.tsx**

```tsx
import { MessageCircle, X } from 'lucide-react'
import { useLocation } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useChat } from '@/contexts/ChatContext'
import { ChatPanel } from './ChatPanel'
import { cn } from '@/lib/utils'
import { featureFlags } from '@/lib/feature-flags'

export function ChatWidget() {
  const { isOpen, setIsOpen, messages } = useChat()
  const location = useLocation()

  // Hide on admin routes or when feature is disabled
  if (!featureFlags.chat) return null
  if (/\/admin(\/|$)/.test(location.pathname)) return null

  return (
    <>
      {/* Bubble */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className={cn(
              'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center',
              'rounded-full bg-primary text-primary-foreground shadow-lg',
              'transition-shadow hover:shadow-xl hover:shadow-primary/25',
              messages.length === 0 && 'animate-pulse',
            )}
            aria-label="Open chat"
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'fixed z-50 overflow-hidden rounded-xl border border-border bg-card shadow-2xl',
              // Desktop
              'bottom-6 right-6 w-[400px]',
              // Mobile — full screen
              'max-sm:inset-0 max-sm:bottom-0 max-sm:right-0 max-sm:w-full max-sm:rounded-none',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-semibold">Chat with Horizon</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat body */}
            <ChatPanel height="h-[420px] max-sm:h-[calc(100vh-8rem)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/chat/ChatWidget.tsx
git commit -m "feat(chat): add floating ChatWidget with bubble + slide-up panel"
```

---

## Task 11: Mount ChatProvider + ChatWidget in Root

**Files:**
- Modify: `src/routes/__root.tsx`

- [ ] **Step 1: Add imports and mount**

Add imports at the top:

```typescript
import { ChatProvider } from '@/contexts/ChatContext'
import { ChatWidget } from '@/components/chat/ChatWidget'
```

Wrap the non-admin layout return with `ChatProvider` and add `ChatWidget` after `Footer`:

Change the non-admin return block to:

```tsx
return (
    <MotionConfig reducedMotion="user">
      <ChatProvider>
      <div className="min-h-screen flex flex-col relative">
        <a href="#main-content" className="skip-link">
          {t('nav.skipToContent')}
        </a>
        <CRTOverlay />
        <CRTStartup />
        <Navbar />
        <main
          id="main-content"
          tabIndex={-1}
          className="relative flex-1 overflow-x-hidden pt-16 pb-8 md:pb-0"
        >
            <Outlet />
        </main>
        <Footer />
        <ChatWidget />
        <div
          aria-hidden
          className="h-[calc(6.75rem+env(safe-area-inset-bottom))] md:hidden"
        />
        <MobileBottomNav />
        <TanStackRouterDevtools />
        <TanStackQueryLayout />
      </div>
      </ChatProvider>
    </MotionConfig>
  )
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/__root.tsx
git commit -m "feat(chat): mount ChatProvider and ChatWidget in root layout"
```

---

## Task 12: Landing Page Chat Section

**Files:**
- Create: `src/components/landing/ChatSection.tsx`
- Modify: `src/routes/{-$locale}/index.tsx`

- [ ] **Step 1: Create ChatSection.tsx**

```tsx
import { MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useChat } from '@/contexts/ChatContext'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

const SUGGESTED_PROMPTS = [
  'What tech stack do you use?',
  'How does your engagement model work?',
  'Tell me about your cloud services',
  'What industries do you work with?',
]

export function ChatSection() {
  const { t } = useTranslation('landing')
  const { send, messages } = useChat()

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="container mx-auto px-6 lg:px-8 max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-2 items-start">
          {/* Left — headline + prompts */}
          <div className="lg:sticky lg:top-24">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <MessageCircle className="h-3.5 w-3.5" />
              AI-Powered
            </div>

            <h2
              className={cn(
                designSystem.typography.heading.h1,
                'text-3xl md:text-4xl font-bold mb-4',
              )}
            >
              Ask Us Anything
            </h2>

            <p
              className={cn(
                designSystem.typography.body.large,
                designSystem.typography.muted,
                'mb-8 max-w-md',
              )}
            >
              Chat with our AI assistant to learn about our services, tech stack, and how we work. No forms, no waiting.
            </p>

            {/* Suggested prompts */}
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  disabled={messages.length > 0}
                  className={cn(
                    'rounded-lg border border-border bg-card px-3 py-2 text-sm text-left',
                    'transition-all duration-200 hover:border-primary/30 hover:bg-primary/5',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Right — inline chat */}
          <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-semibold">Chat with Horizon</span>
            </div>
            <ChatPanel height="h-[450px]" />
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add ChatSection to landing page**

In `src/routes/{-$locale}/index.tsx`, add lazy import at top:

```typescript
const ChatSection = lazy(() => import('@/components/landing/ChatSection').then(m => ({ default: m.ChatSection })))
```

Add the section between FAQ and the closing `</div>` of `landing-page`, just before the FAQ section's closing `</Suspense>`:

```tsx
        {featureFlags.chat && (
        <Suspense fallback={null}>
        <div id="chat" className="landing-section landing-section--alt-b scroll-mt-24">
          <ChatSection />
        </div>
        </Suspense>
        )}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/ChatSection.tsx src/routes/{-\$locale}/index.tsx
git commit -m "feat(chat): add inline ChatSection on landing page with suggested prompts"
```

---

## Task 13: Backend Env Vars + Local Settings

**Files:**
- Modify: `api/local.settings.json`

- [ ] **Step 1: Add chat env vars to local.settings.json**

Add to the `Values` object:

```json
"CHAT_LLM_ENDPOINT": "https://hamza-maayxgzf-eastus2.cognitiveservices.azure.com/",
"CHAT_LLM_DEPLOYMENT": "gpt-5.4",
"CHAT_LLM_API_KEY": "",
"NVIDIA_API_KEY": "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"
```

Note: `CHAT_LLM_API_KEY` needs to be filled in with the Azure OpenAI key.

- [ ] **Step 2: Commit**

Do NOT commit local.settings.json (it contains secrets and should be in .gitignore).

---

## Task 14: Build Verification

- [ ] **Step 1: Build backend**

```bash
cd api && dotnet build
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 2: Build frontend**

```bash
npm run build
```

Expected: Build succeeded, no TypeScript errors.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(chat): complete LLM chatbot with floating widget and landing section"
```
