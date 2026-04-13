# Horizon Tech — Architecture & Deployment Guide

## System Overview

Horizon Tech runs on a **split architecture**: Cloudflare Workers as the edge layer (SSR, routing, reads) and Azure Functions as the compute engine (writes, auth, AI, email). Data flows one way for writes (Azure Cosmos DB) and is replicated to the edge (Cloudflare D1) via Change Feed sync.

```
                          Cloudflare Edge
                   +---------------------------+
    User --------> | Workers (Hono)            |
                   |  - SSR (TanStack Start)   |
                   |  - D1 reads               |
                   |  - R2 image cache          |
                   |  - Edge HTML cache         |
                   +---------------------------+
                            |
                   Writes / Auth / AI / Email
                            |
                            v
                   +---------------------------+
                   | Azure Functions (.NET 10)  |
                   |  - Cosmos DB (writes)      |
                   |  - Blob Storage (images)   |
                   |  - Azure Translator        |
                   |  - Azure OpenAI / Anthropic|
                   |  - Graph API (email)       |
                   +---------------------------+
                            |
                   Change Feed triggers
                            |
                            v
                   +---------------------------+
                   | Worker /api/internal/sync  |
                   |  -> D1 upsert              |
                   +---------------------------+
```

---

## Infrastructure Components

### 1. Cloudflare Workers (Frontend + Edge Router)

| Setting | Value |
|---------|-------|
| Worker name | `horizon-frontend` |
| Account ID | `f3da2a96eda666c8ef38d90ef261eb84` |
| Entrypoint | `src/server.ts` (Hono app) |
| Compatibility date | `2026-04-01` |
| Compatibility flags | `nodejs_compat_v2` |
| Routes | `horizon-tech.io/*`, `www.horizon-tech.io/*` |

**Bindings:**

| Binding | Type | Resource |
|---------|------|----------|
| `DB` | D1 Database | `horizon-db` (`f6834707-533f-4e6f-aace-f8034ad19f27`) |
| `IMG_CACHE` | R2 Bucket | `horizon-img-cache` |
| `IMG_WRITE_QUEUE` | Queue Producer | `img-r2-writes` |
| `ASSETS` | Static Assets | Auto-bound by Wrangler |
| `API_ORIGIN` | Env Var | `https://ht-func-prod.azurewebsites.net` |
| `JWT_SECRET` | Secret | JWT token verification |
| `SYNC_SECRET` | Secret | Internal sync auth |

**Worker Routing (`src/server.ts`):**

| Route | Handler | Strategy |
|-------|---------|----------|
| `/img/*` | Image proxy | R2 cache -> Azure Blob (circuit breaker) |
| `GET /api/blog*`, `/api/case-studies*`, `/api/authors*` | D1 edge read | Fallback: Azure proxy |
| `GET /api/manage/*`, `/api/roles*` | D1 admin read | Fallback: Azure proxy |
| `POST/PUT/DELETE /api/manage/*` | Azure proxy | Writes always go to Cosmos |
| `POST /api/internal/sync` | Sync receiver | Shared-secret auth, D1 batch upsert |
| `POST /api/internal/image-warm` | Image warmer | Pre-populate R2 from Azure Blob |
| `GET /api/internal/health` | Health check | D1 counts + sync staleness |
| `ALL /api/*` | Azure proxy | Auth, chat, uploads, contact |
| `ALL *` | TanStack Start SSR | Edge-cached HTML (s-maxage=60, SWR=300) |

### 2. Azure Functions (.NET 10)

| Setting | Value |
|---------|-------|
| App name | `ht-func-prod` |
| Host | `ht-func-prod.azurewebsites.net` |
| Runtime | .NET 10, Azure Functions V4, `dotnet-isolated` |
| Project | `api/Api.csproj` |
| Timeout | 5 minutes |
| Max concurrent | 100 (200 outstanding) |

**Function Endpoints (60+):**

| Domain | Routes | Description |
|--------|--------|-------------|
| Auth | `auth/register`, `auth/login`, `auth/external-login`, `auth/exchange-code`, `auth/refresh-token`, `auth/revoke-token` | Registration, JWT login, Microsoft OAuth, token refresh |
| Blog | `blog`, `blog/{slug}`, `manage/blog/*`, `manage/blog/{slug}/translate`, `manage/blog/{slug}/translations/*` | CRUD + auto-translation to 130+ languages |
| Categories | `blog/categories`, `manage/categories/*` | Blog categories with translations |
| Tags | `blog/tags`, `manage/tags/*` | Blog tags with translations |
| Case Studies | `case-studies`, `case-studies/{slug}`, `manage/case-studies/*` | CRUD for case studies |
| Roles/Perms | `roles`, `permissions`, `manage/roles/*` | RBAC role management |
| Users | `manage/users`, `manage/users/{id}/*` | User management, role assignment |
| Profile | `user/profile`, `user/avatar`, `user/page-image`, `user/page/translate`, `user/page/translations/*` | Profile, avatar, page content, translations |
| API Keys | `user/api-keys`, `user/api-keys/{keyId}` | API key management |
| LLM | `manage/llm/providers/*`, `manage/llm/settings` | Admin-configurable LLM providers |
| Chat | `chat` | SSE streaming chat with lead capture |
| Contact | `contact` | Contact form with Turnstile + email |
| Images | `manage/blog/upload-image`, `manage/images/sweep`, `manage/images/migrate` | Multipart upload, WebP processing |
| Sync | `manage/force-sync`, `manage/translation-sync` | Manual D1 re-sync |

**Change Feed Triggers (8 functions):**

| Cosmos Container | Synced To D1 |
|-----------------|-------------|
| `blogPosts` | `blog_posts` |
| `users` | `users` |
| `categories` | `categories` + `category_translations` |
| `tags` | `tags` + `tag_translations` |
| `caseStudies` | `case_studies` + related tables |
| `roles` | `roles` |
| `blogPostTranslations` | `blog_post_translations` |
| `userPageTranslations` | `user_page_translations` |

**Timer Trigger:** `SyncHealthCheck` — every 5 minutes, pings Worker health endpoint, alerts if D1 staleness > 300s.

### 3. Azure Cosmos DB (Source of Truth)

| Setting | Value |
|---------|-------|
| Account | `horizon-cosmos.documents.azure.com` |
| Database | `horizon` |
| Connection | Direct (TCP) |
| Serialization | camelCase |

**Containers:**

| Container | Partition Key | Purpose |
|-----------|--------------|---------|
| `blogPosts` | `/slug` | Blog content |
| `blogPostTranslations` | `/postSlug` | Blog translations (ID: `{slug}:{lang}`) |
| `users` | `/email` | User accounts |
| `userPageTranslations` | `/userId` | User page translations |
| `categories` | `/slug` | Blog categories (inline translations) |
| `tags` | `/slug` | Blog tags (inline translations) |
| `caseStudies` | `/slug` | Case studies |
| `roles` | `/slug` | RBAC roles |
| `llmProviders` | `/key` | LLM provider configs |
| `llmSettings` | `/id` | Global LLM settings (singleton: `global`) |
| `processedImages` | `/path` | Image processing manifest |
| `leases` | (system) | Change Feed lease tracking |

### 4. Cloudflare D1 (Edge Read Replica)

| Setting | Value |
|---------|-------|
| Database name | `horizon-db` |
| ID | `f6834707-533f-4e6f-aace-f8034ad19f27` |
| ORM | Drizzle (`src/server/db/schema.ts`) |
| Migrations | `src/server/db/migrations/` |

**Tables (20):** `users`, `blog_posts`, `categories`, `tags`, `case_studies`, `roles`, `llm_providers`, `llm_settings`, `api_keys`, `case_study_decisions`, `case_study_results`, `refresh_tokens`, `blog_post_translations`, `category_translations`, `tag_translations`, `case_study_translations`, `user_page_translations`, `blog_post_tags`, `user_roles`, `processed_images`

### 5. Storage

**Azure Blob Storage:**

| Account | URL |
|---------|-----|
| `htstorageprod` | `https://htstorageprod.blob.core.windows.net` |

| Container | Purpose | WebP Variants |
|-----------|---------|---------------|
| `blog-images` | Blog covers/banners | 400, 800, 1200, 1600, 2000px |
| `avatars` | User avatars | 48, 96, 192px |
| `page-images` | User page content | 400, 800, 1200, 1600, 2000px |
| `locales` | Translation JSON files | — |

**Cloudflare R2 (Edge Image Cache):**

| Bucket | Key Format | Population |
|--------|-----------|------------|
| `horizon-img-cache` | `{blobPath}/w{width}-v{timestamp}.webp` | Via `img-r2-writes` queue |

**Image Request Flow:**
1. Edge Cache (Cache API) -> 2. R2 bucket -> 3. Azure Blob (circuit breaker: 3 failures / 60s) -> 4. Fallback: Cloudflare Image Resizing

### 6. Queue System

| Queue | Producer | Consumer | Max Retries | DLQ |
|-------|----------|----------|-------------|-----|
| `img-r2-writes` | Worker image handler | Worker queue handler | 3 | `img-r2-writes-dlq` |

Message: `{ r2Key, blobUrl, contentType, timestamp }`

### 7. Third-Party Services

| Service | Purpose | Config |
|---------|---------|--------|
| GA4 | Analytics | `G-ECRK2ED5C4` |
| Microsoft Clarity | Session recording | `wayn0660lq` |
| Cloudflare Turnstile | Bot protection | Contact + chat |
| Azure Translator | Auto-translation | `northeurope`, 130+ languages |
| Microsoft Graph API | Email | AAD credentials, `hello@horizon-tech.io` |
| Azure OpenAI | Chat (primary) | `gpt-5.4`, East US 2 |
| Azure AI Anthropic | Blog review | `claude-opus-4-6` |
| NVIDIA NIM | Chat (fallback) | `z-ai/glm5` |
| Microsoft OAuth | Social login | `d132de4b-...` |
| IndexNow | Search indexing | `ccf536f3...` |

---

## Data Flow

### Write Path
```
User -> Worker /api/* -> Azure proxy -> Azure Function -> Cosmos DB
  -> Change Feed trigger -> POST /api/internal/sync -> D1 upsert
```

### Read Path
```
User -> Worker -> D1 query (<10ms at edge)
  (D1 miss: fallback to Azure proxy)
```

### Image Path
```
Upload:  User -> Azure Function -> Blob Storage (original + WebP variants)
           -> Cosmos processedImages -> Change Feed -> D1 sync

Serve:   User -> Worker /img/* -> Edge Cache -> R2 -> Azure Blob
           -> Queue R2 write for next request
```

### SSR Path
```
Request -> Worker -> Edge Cache hit? Return cached HTML
  -> Cache miss: TanStack Start SSR
    -> beforeLoad: load translations (ASSETS binding)
    -> React renderToReadableStream
    -> cache.put() via caches.default
    -> Return HTML (s-maxage=60, stale-while-revalidate=300)
```

---

## Environment Variables

### Frontend (Vite Client — `.env.production`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_APP_TITLE` | Yes | App title |
| `VITE_API_URL` | Yes | API endpoint (`/api` in production) |
| `VITE_MICROSOFT_CLIENT_ID` | Yes | Microsoft OAuth client ID |
| `VITE_GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `VITE_FEATURE_CASE_STUDIES` | No | Feature flag |
| `VITE_FEATURE_TECHNICAL_RESOURCES` | No | Feature flag |
| `VITE_FEATURE_INNOVATION_LAB` | No | Feature flag |
| `VITE_FEATURE_CHAT` | No | Feature flag |

### Cloudflare Worker Secrets

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put SYNC_SECRET
```

### Azure Functions App Settings

| Variable | Description |
|----------|-------------|
| `COSMOS_CONNECTION_STRING` | Cosmos DB connection |
| `CosmosDBConnection` | Same (for Change Feed bindings) |
| `BLOB_STORAGE_CONNECTION_STRING` | Azure Blob Storage |
| `JWT_SECRET` | JWT signing (must match Worker) |
| `JWT_ISSUER` | `horizon-tech` |
| `JWT_AUDIENCE` | `horizon-frontend` |
| `AZURE_TENANT_ID` | AAD tenant for Graph API |
| `AZURE_CLIENT_ID` | AAD app client ID |
| `AZURE_CLIENT_SECRET` | AAD app secret |
| `MAIL_FROM` / `MAIL_TO` | Email addresses |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile |
| `ADMIN_EMAILS` | Admin email list |
| `AZURE_TRANSLATION_KEY` | Azure Translator |
| `AZURE_TRANSLATION_REGION` | `northeurope` |
| `CHAT_LLM_ENDPOINT` | Azure OpenAI endpoint |
| `CHAT_LLM_DEPLOYMENT` | Azure OpenAI model |
| `CHAT_LLM_API_KEY` | Azure OpenAI key |
| `LLM_REVIEW_ENDPOINT` | Anthropic via Azure AI |
| `LLM_REVIEW_API_KEY` | Anthropic key |
| `NVIDIA_API_KEY` | NVIDIA NIM fallback |
| `MICROSOFT_CLIENT_ID` / `SECRET` | OAuth app |
| `ManifestSync:Endpoint` | Worker manifest URL |
| `ManifestSync:SyncEndpoint` | Worker sync URL |
| `ManifestSync:Secret` | Sync shared secret |

---

## Manual Deployment

### Prerequisites

- Node.js 20+, .NET 10 SDK
- `npm i -g wrangler` (Cloudflare CLI)
- `npm i -g azure-functions-core-tools@4`
- `az` CLI (Azure)

### Frontend (Cloudflare Workers)

```bash
# Install + build
npm ci
npm run generate:sitemap
npm run build

# Deploy
npx wrangler deploy

# Set secrets (first time or rotation)
npx wrangler secret put JWT_SECRET
npx wrangler secret put SYNC_SECRET

# D1 migrations (if schema changed)
npx wrangler d1 migrations apply horizon-db --remote

# Ping search engines
bash scripts/indexnow-ping.sh
```

### Backend (Azure Functions)

```bash
cd api
dotnet publish -c Release -o ./publish
cd publish
func azure functionapp publish ht-func-prod
```

### D1 Database Operations

```bash
# Run migrations
npx wrangler d1 migrations apply horizon-db --remote

# Force full re-sync from Cosmos
curl -X POST https://www.horizon-tech.io/api/manage/force-sync \
  -H "Authorization: Bearer <admin-jwt>"

# Check sync health
curl https://www.horizon-tech.io/api/internal/health \
  -H "X-Internal-Auth: <sync-secret>"
```

### Secrets Rotation

```bash
# JWT secret (must match both sides)
az functionapp config appsettings set \
  -g ht-web-prod -n ht-func-prod \
  --settings JWT_SECRET=<new-secret>
npx wrangler secret put JWT_SECRET

# Sync secret
az functionapp config appsettings set \
  -g ht-web-prod -n ht-func-prod \
  --settings "ManifestSync:Secret=<new-secret>"
npx wrangler secret put SYNC_SECRET
```

---

## CI/CD

**File:** `.github/workflows/deploy-cloudflare.yml`

| Trigger | Action |
|---------|--------|
| Push to `master` | Production deploy |
| PR to `master` | Preview deploy |

Pipeline: checkout -> Node 20 -> `npm ci` -> `npm run generate:sitemap` -> `npm run build` -> `wrangler deploy`

**Required GitHub Secret:** `CLOUDFLARE_API_TOKEN`

**Branch Strategy:** `develop` (integration) -> `master` (production, auto-deploy). Azure Functions deployed separately.

---

## Monitoring

| What | How |
|------|-----|
| D1 sync freshness | `SyncHealthCheck` timer (every 5min), alerts if >300s stale |
| Lighthouse scores | `/lighthouse` skill or `node .claude/skills/lighthouse/scripts/audit.js` |
| Edge cache | HTML: 60s TTL + 300s SWR. API: 300s (lists) / 3600s (detail) |
| Image circuit breaker | 3 Azure Blob failures in 60s trips breaker, falls back to CF Image Resizing |
| Error tracking | Console errors visible in Lighthouse BP audit |

---

## Feature Flags

| Flag | Default | Controls |
|------|---------|----------|
| `VITE_FEATURE_CASE_STUDIES` | `false` | Case studies section + routes |
| `VITE_FEATURE_TECHNICAL_RESOURCES` | `false` | Technical resources pages |
| `VITE_FEATURE_INNOVATION_LAB` | `false` | Innovation lab section + routes |
| `VITE_FEATURE_CHAT` | `true` | Chat widget |

Disabled features are excluded from the sitemap and SSR routes.
