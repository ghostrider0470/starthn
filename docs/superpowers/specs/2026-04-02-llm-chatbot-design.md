# LLM Chatbot — Design Spec

**Date:** 2026-04-02
**Status:** Approved

## Overview

Add an LLM-powered chatbot to the Horizon Tech website with two surfaces: a persistent floating widget available on all pages, and a prominent inline chat section on the landing page. The bot knows about Horizon Tech's services, team, and capabilities, and can collect lead information naturally during conversation.

## Architecture

Three pieces:

1. **Backend** — Azure Function `POST /api/chat` (public, no auth). Accepts `{ messages, sessionId, turnstileToken }`. Streams SSE responses. Proxies to NVIDIA API with a server-side system prompt.
2. **Frontend Chat Widget** — `ChatWidget.tsx` mounted in `__root.tsx`. Floating bubble bottom-right, opens a slide-up chat panel. Uses `fetch` with `ReadableStream` for SSE streaming.
3. **Landing Page Chat Section** — inline two-column chat section between FAQ and footer. Same backend, same hook, shared conversation state.

### Data Flow

```
User types → ChatWidget/LandingChat → fetch POST /api/chat (streaming)
  → Azure Function → prepends system prompt → NVIDIA API (streaming)
  → SSE chunks back to browser → rendered token by token
```

## Backend — `ChatFunction.cs`

### Endpoint

- **Route:** `POST /api/chat`
- **Auth:** Anonymous (public)
- **Protection:** Cloudflare Turnstile validation on first message per session
- **Rate limit:** 50 messages per hour per IP (tracked in-memory with sliding window)

### Request

```json
{
  "messages": [
    { "role": "user", "content": "What services do you offer?" }
  ],
  "sessionId": "random-uuid",
  "turnstileToken": "token-from-client"
}
```

### Response

Server-Sent Events (SSE) stream. Each chunk:

```
data: {"content": "We offer", "done": false}
data: {"content": " six core", "done": false}
data: {"content": " services...", "done": false}
data: {"content": "", "done": true}
```

### LLM Provider (3-tier fallback)

Resolution order:

1. **Admin panel (DB):** `LlmSettingsEntity` gains `chatProviderKey` + `chatModelId` fields. If set, loads the provider from the existing `LlmProviderEntity` collection — reuses the same provider pool as translation review. Configurable from admin UI.

2. **Env vars (default):** If DB config is empty/disabled, uses dedicated Azure OpenAI resource:
   - `CHAT_LLM_ENDPOINT` (`https://hamza-maayxgzf-eastus2.cognitiveservices.azure.com/`)
   - `CHAT_LLM_DEPLOYMENT` (`gpt-5.4`)
   - `CHAT_LLM_API_KEY`
   - API format: Azure OpenAI REST (`/openai/deployments/{deployment}/chat/completions?api-version=2024-10-21`)

3. **NVIDIA fallback:** If both above fail or are unconfigured:
   - Endpoint: `https://integrate.api.nvidia.com/v1/chat/completions`
   - Model: `z-ai/glm5`
   - Auth: `NVIDIA_API_KEY` env var
   - API format: OpenAI-compatible

All three support streaming via SSE.

### System Prompt

Baked server-side (never sent from client). Contains:

- **Company:** Horizon Tech, EU-based software consultancy, HQ Sarajevo, Bosnia
- **Services:** Enterprise Software Development, AI/ML & Business Intelligence, Cloud Architecture, IoT & Edge Computing, DevOps & Platform Engineering, Digital Transformation
- **Tech stack:** .NET, C#, React, TypeScript, Node.js, Python, Azure, AWS, Kubernetes, Docker, Terraform, PostgreSQL, MongoDB, and more
- **Team:** 25+ engineers, 9+ countries, remote-first, CET timezone
- **Engagement model:** Dedicated teams embedded in client workflow, not body-shopping
- **Personality:** Friendly tech expert — conversational, knowledgeable, not salesy
- **Language:** Respond in the same language the user writes in
- **Lead capture:** When the user describes a concrete project need, budget, or timeline, naturally ask for their name and email so the team can follow up. If they decline, link to /contact. Never push.

### Lead Detection & Notification

After each completed bot response, the backend scans the full conversation for:
- Email address (regex)
- Expressed project intent keywords

When both are present, send a notification email to `hello@horizon-tech.io` via the existing `IEmailService` (Graph API) with:
- User's email
- Conversation summary (last 5 messages)
- Timestamp

Fire once per sessionId (track notified sessions in-memory).

### Rate Limiting

In-memory `ConcurrentDictionary<string, List<DateTime>>` keyed by client IP. Sliding window of 1 hour, max 50 entries. Returns HTTP 429 with `Retry-After` header when exceeded.

### Environment Variables

- `CHAT_LLM_ENDPOINT` — Azure OpenAI endpoint (default fallback)
- `CHAT_LLM_DEPLOYMENT` — Azure OpenAI deployment name (default fallback)
- `CHAT_LLM_API_KEY` — Azure OpenAI API key (default fallback)
- `NVIDIA_API_KEY` — NVIDIA free API key (last resort fallback)
- `TURNSTILE_SECRET_KEY` — already exists in settings

### DB Schema Changes

`LlmSettingsEntity` — add two fields:
- `chatProviderKey: string?` — key of the provider to use for chat (references `LlmProviderEntity.Key`)
- `chatModelId: string?` — model ID within that provider

## Frontend — Chat Widget

### Component: `ChatWidget.tsx`

- **Mount point:** `__root.tsx`, after Footer, before MobileBottomNav
- **Visibility:** All pages except `/admin/*` routes
- **Feature flag:** `VITE_FEATURE_CHAT=true`

### Bubble

- Fixed position, bottom-right (bottom-6 right-6)
- 56px circle, primary color background, chat icon
- Subtle pulse animation on first visit (stops after first open)
- Badge with unread indicator if bot sent a greeting while closed

### Panel

- Slides up from bubble position
- Desktop: 400px wide, 500px tall, rounded-xl, shadow-2xl
- Mobile: full-screen Sheet component (existing pattern)
- Header: "Chat with Horizon" title + minimize (X) button
- Message area: scrollable, auto-scroll on new messages
  - User messages: right-aligned, primary background, white text
  - Bot messages: left-aligned, muted background, foreground text
  - Streaming: tokens appear incrementally with a blinking cursor
- Input: single-line text input + send button (ArrowUp icon)
  - Disabled while streaming
  - Enter to send, Shift+Enter for newline
- Z-index: 50 (above content, below modals at z-60)

### State Management

- `sessionStorage` for message history (persists across navigation, clears on tab close)
- Random `sessionId` generated once per session
- Turnstile token validated on first message only

## Frontend — Landing Page Chat Section

### Placement

New section between FAQ and Footer on the landing page. Section ID: `chat`.

### Layout

- Two-column on desktop, stacked on mobile
- **Left column:** Headline ("Ask Us Anything"), subtitle, 3-4 suggested prompt pills:
  - "What tech stack do you use?"
  - "How does your engagement model work?"
  - "Tell me about your cloud services"
  - "What industries do you work with?"
- **Right column:** Inline chat interface (same internals as widget but taller — ~450px)

### Shared State

Both widget and landing section use the same `ChatProvider` context so:
- Starting a conversation in the landing section continues in the widget
- Messages are never duplicated
- Only one streaming request at a time

## Frontend — `useChatStream` Hook

```typescript
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface UseChatStreamReturn {
  messages: ChatMessage[]
  send: (content: string) => void
  isStreaming: boolean
  error: string | null
  clearMessages: () => void
}
```

### Implementation

- `fetch` with `ReadableStream` + `TextDecoder` for SSE parsing
- Appends tokens to the last assistant message as they arrive
- On error: sets `error` state, does not retry automatically
- Stores messages in `sessionStorage` on every update
- Hydrates from `sessionStorage` on mount

### Context Provider: `ChatProvider`

Wraps the app in `__root.tsx`. Provides `useChatStream` return value + `isOpen` / `setIsOpen` for widget visibility.

## Not In Scope

- Chat history persistence across sessions (no database)
- Admin dashboard for viewing conversations
- Analytics or conversation metrics
- File or image uploads
- Multiple concurrent conversations
- Typing indicators beyond streaming cursor
