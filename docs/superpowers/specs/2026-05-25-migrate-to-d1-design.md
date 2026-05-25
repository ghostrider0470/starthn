# Migrate to D1 — Design Spec

**Date:** 2026-05-25  
**Branch:** `migrate-to-d1`  
**Approach:** Option 3 — Prepare fully, cut over cleanly (single maintenance window)

---

## Problem

The current architecture keeps Cosmos DB (Azure) as the source of truth and replicates data to Cloudflare D1 via a Change Feed sync pipeline. This dual-database setup has caused a persistent class of bugs:

- Translation sync arriving before parent post (409 parent-not-found)
- BCP47 locale codes (`bs-BA`) mismatching Azure Translator codes (`bs`) stored in D1
- Soft-deleted "ghost" posts appearing in admin because queries lacked `IsDeleted` filters
- Force-sync endpoints needed to recover stale D1 state

All painful debugging sessions have been sync bugs, not application bugs. The fix is to eliminate the sync entirely.

---

## Target Architecture

### Cloudflare Workers — handles everything user-facing

- **Public reads:** D1 at the edge (already in place, unchanged)
- **All writes:** blog posts, categories, tags, case studies, users, roles — Workers writes directly to D1
- **Auth:** login, register, JWT signing/verification, refresh tokens, Microsoft OAuth, Google OAuth — all in Workers
- **Proxies to Azure only for four compute endpoints** (see below)

### Azure Functions — compute sidecar only (four endpoints)

| Endpoint | Reason to stay in Azure |
|---|---|
| `POST /api/manage/blog/:slug/translate` | Azure Translator API, long-running |
| `POST /api/manage/blog/upload-image` | Image processing + R2 upload |
| `POST /api/chat` | LLM, potentially long-running |
| `POST /api/contact` | Microsoft Graph API email (uses Azure AD app credential) |
| `POST /api/user/page/translate` | Azure Translator, long-running |

When compute jobs finish, they write results back to D1 via `POST /api/internal/sync` (existing endpoint, unchanged).

### Cosmos DB — decommissioned

All Cosmos containers removed. Change Feed triggers deleted. The Azure Functions project is slimmed to the five compute endpoints above.

---

## Section 1 — Workers CRUD Handlers

New Hono route files in `src/server/routes/`, registered in `server.ts`. All D1 repositories already exist.

### Content routes (`manage:blog`, `manage:content` permissions)

```
GET    /api/manage/blog               list all posts (admin)
POST   /api/manage/blog               create post
PUT    /api/manage/blog/:slug         update post
DELETE /api/manage/blog/:slug         delete post
GET    /api/manage/categories         list categories
POST   /api/manage/categories         create category
PUT    /api/manage/categories/:id     update category
DELETE /api/manage/categories/:id     delete category
GET    /api/manage/tags               list tags
POST   /api/manage/tags               create tag
PUT    /api/manage/tags/:id           update tag
DELETE /api/manage/tags/:id           delete tag
GET    /api/manage/case-studies       list case studies
POST   /api/manage/case-studies       create case study
PUT    /api/manage/case-studies/:slug update case study
DELETE /api/manage/case-studies/:slug delete case study
```

### User & role management routes (`manage:users` permission)

```
GET  /api/manage/users               list users
GET  /api/manage/users/:id           get user
PUT  /api/manage/users/:id/roles     update user roles
PUT  /api/manage/users/:id/status    activate/deactivate user
GET  /api/manage/roles               list roles
GET  /api/manage/permissions         list all permissions
```

### LLM configuration routes (`manage:llm` permission)

```
GET    /api/manage/llm/providers       list LLM providers
POST   /api/manage/llm/providers       create provider
PUT    /api/manage/llm/providers/:key  update provider
DELETE /api/manage/llm/providers/:key  delete provider
GET    /api/manage/llm/settings        get LLM settings
PUT    /api/manage/llm/settings        update LLM settings
```

### Profile routes (authenticated, own data only)

```
GET  /api/user/profile               get own profile
PUT  /api/user/profile               update own profile
POST /api/user/change-password       change password (bcrypt re-hash)
GET  /api/user/page/translations     get own page translations
```

File structure:
```
src/server/routes/
  auth.ts           login, register, refresh, revoke, exchange-code
  blog.ts           blog CRUD + seed
  categories.ts     category CRUD
  tags.ts           tag CRUD
  case-studies.ts   case study CRUD
  users.ts          user management
  profile.ts        own profile + password
```

---

## Section 2 — Auth in Workers

### Stack

| Concern | Implementation |
|---|---|
| Password hashing | `bcryptjs` (Workers-compatible) |
| JWT sign/verify | Web Crypto API (`crypto.subtle`) |
| Refresh tokens | D1 `refresh_tokens` table (already schema'd) |
| Microsoft OAuth | `fetch` to `login.microsoftonline.com` token endpoint |
| Google OAuth | `fetch` to `oauth2.googleapis.com` token endpoint |
| JWT secret | `JWT_SECRET` Worker secret (already exists) |
| Admin email detection | `ADMIN_EMAILS` Worker secret (comma-separated) |

### File structure

```
src/server/auth/
  jwt.ts            sign(), verify(), decode() using Web Crypto
  middleware.ts     Hono middleware — verifies Bearer token, attaches principal
  permissions.ts    hasPermission(), requirePermission() helpers
```

### OAuth flow (Microsoft + Google)

Both follow the same pattern:
1. Frontend completes the OAuth redirect and sends the auth code to `POST /api/auth/exchange-code`
2. Workers exchanges the code for tokens by calling the provider's token endpoint via fetch
3. Decodes the ID token (JWT decode, no verification needed — provider already verified)
4. Extracts email, upserts user in D1, assigns roles
5. Issues our own JWT + refresh token, returns to client

Secrets required in Cloudflare Worker environment:
- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` (Microsoft OAuth)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Google OAuth)

### Permission model

On each authenticated request, the middleware:
1. Verifies JWT signature
2. Reads `user_id` from claims
3. Joins `user_roles` → `roles.permissions` in D1
4. Attaches permissions array to request context

This replaces the `AuthHelper` + `AuthGuard` pattern from the C# codebase.

---

## Section 3 — Data Migration Script

**File:** `scripts/migrate-cosmos-to-d1.ts`

### Run modes

```bash
npx tsx scripts/migrate-cosmos-to-d1.ts --export   # Export Cosmos → JSON files (~2 min)
npx tsx scripts/migrate-cosmos-to-d1.ts --import   # Import JSON → D1 (~2 min)
npx tsx scripts/migrate-cosmos-to-d1.ts --verify   # Count comparison (~30 sec)
```

`--export` can be run days before the maintenance window to pre-stage data. Only `--import` and `--verify` need the window.

### Export order (respects FK dependencies)

1. `roles` → `scripts/data/roles.json`
2. `users` → `scripts/data/users.json`
3. `blogPosts` → `scripts/data/blog-posts.json`
4. `blogPostTranslations` → `scripts/data/blog-post-translations.json`
5. `categories` → `scripts/data/categories.json`
6. `tags` → `scripts/data/tags.json`
7. `caseStudies` → `scripts/data/case-studies.json`
8. `userPageTranslations` → `scripts/data/user-page-translations.json`
9. `processedImages` → `scripts/data/processed-images.json`

Skips documents where `_deleted: true`. Uses the transform logic already in `sync-receiver.ts`.

### Import

Batched `INSERT OR REPLACE` statements via `wrangler d1 execute --remote`, same order as export. Uses D1 batch API for atomicity per table.

### Verification

Prints a count table and exits non-zero if any count mismatches:

```
roles              Cosmos: 4    D1: 4    ✓
users              Cosmos: 12   D1: 12   ✓
blog_posts         Cosmos: 47   D1: 47   ✓
...
```

---

## Section 4 — Cutover Procedure

**Estimated window: ~10 minutes**

### Before the window (any time)

- [ ] Run `--export` to pre-stage JSON files
- [ ] Deploy new Workers build to workers.dev
- [ ] Smoke-test on workers.dev: register, login, Microsoft OAuth, create post, check translations proxy to Azure, send contact form

### During the window

1. Set `MAINTENANCE=true` Worker secret → write endpoints return 503
2. Run `--import` + `--verify`
3. Deploy production Workers build with new auth/CRUD routes active
4. Remove `MAINTENANCE` secret
5. Smoke-test production: login, create post, translations, contact form

### Rollback (if needed)

- Azure Functions are untouched — still deployed
- Revert `server.ts` to proxy auth/CRUD to Azure
- One deploy, ~2 minutes
- Cosmos data is unchanged (export was read-only)

### Post-window (next day, once confident)

- [ ] Delete Azure CRUD endpoints (auth, blog CRUD, categories, tags, users, profiles, case studies)
- [ ] Disable and delete `ChangeFeedSyncFunctions.cs`
- [ ] Delete all Cosmos repository files from Azure project
- [ ] Decommission Cosmos DB in Azure portal
- [ ] Remove `ForceSyncFunction.cs`, `SyncHealthCheckFunction.cs`, `TranslationSyncFunction.cs`
- [ ] Remove `IWorkerSyncService` and its implementation (no longer needed)

---

## What Does NOT Change

- All public read endpoints (`/api/blog`, `/api/blog/:slug`, etc.) — already on D1, untouched
- The `/api/internal/sync` endpoint — Azure compute jobs still use it to write results back to D1
- Image proxy (`/img/*`) — unchanged
- Cloudflare R2, queues, KV — unchanged
- The D1 schema — no migrations needed, all 20 tables already exist
- Frontend components and hooks — API contracts are identical, just served from Workers instead of Azure

---

## Cosmos Containers to Decommission

| Container | Migrates to |
|---|---|
| `blogPosts` | D1 `blog_posts` |
| `blogPostTranslations` | D1 `blog_post_translations` |
| `categories` | D1 `categories` |
| `tags` | D1 `tags` |
| `caseStudies` | D1 `case_studies` |
| `roles` | D1 `roles` |
| `users` | D1 `users` |
| `userPageTranslations` | D1 `user_page_translations` |
| `processedImages` | D1 `processed_images` |
| `llmProviders` | D1 `llm_providers` |
| `llmSettings` | D1 `llm_settings` |

---

## Success Criteria

- All existing users can log in (password and Microsoft OAuth)
- Blog posts, translations, categories, tags readable and writable from admin
- Contact form emails delivered via Microsoft Graph (proxied through Azure)
- Translation jobs triggered from admin, results appear in D1
- Zero Cosmos reads/writes in production logs
- Azure Functions reduced to 5 endpoints
