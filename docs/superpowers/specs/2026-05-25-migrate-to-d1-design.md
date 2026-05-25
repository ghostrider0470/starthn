# Migrate to D1 - Design Spec

**Date:** 2026-05-25
**Branch:** `migrate-to-d1`
**Approach:** Option 3 - prepare fully, cut over cleanly in one maintenance window

---

## Decision

Moving the application source of truth from Cosmos DB to Cloudflare D1 is the right call.

The reason is not cost or preference. It is operational simplicity. The current system has two writable data models in practice: Cosmos as primary and D1 as a public/read mirror. Most recent backend bugs have come from keeping those two models consistent rather than from the application behavior itself.

The migration should be treated as an ownership change:

- D1 becomes the only production database for site content, users, roles, profile data, API keys, LLM settings, and translation records.
- Workers own all persisted data reads and writes.
- Azure Functions remain only for compute that is awkward or risky to move right now.
- Cosmos remains read-only during cutover and is decommissioned after production has been stable.

This is a good architectural move only if the implementation removes hidden Cosmos dependencies. A half-migration where Azure still mutates Cosmos and Workers also mutate D1 would keep the same class of bugs.

---

## Problem

The current architecture keeps Cosmos DB (Azure) as the source of truth and replicates data to Cloudflare D1 through a Change Feed sync pipeline. This dual-database setup has caused a persistent class of bugs:

- Translation sync arriving before the parent post (`409 parent_not_found`)
- BCP47 locale codes such as `bs-BA` not matching Azure Translator codes such as `bs`
- Soft-deleted ghost posts appearing in admin because queries missed `IsDeleted` filters
- Force-sync endpoints needed to repair stale D1 state
- Admin writes that appear successful in Azure while the public site still shows old D1 data

The fix is to eliminate database sync as an application concern.

---

## Target Architecture

### Cloudflare Workers - application backend

Workers handle all user-facing and admin API routes that read or write persisted application data:

- Public reads: blog, categories, tags, case studies, authors
- Admin writes: blog posts, translations, categories, tags, case studies, users, roles, authors, LLM settings
- Auth: register, login, refresh, revoke, external login, JWT signing, JWT verification, API keys
- Profile: own profile, password change, page translations, author/page metadata
- Internal sync receiver for Azure compute results

Workers write directly to D1. They do not write to Cosmos.

### Azure Functions - compute sidecar

Azure Functions stay only where they provide compute or third-party integration that we do not want to move during this migration.

| Endpoint | Ownership after migration | Reason |
|---|---|---|
| `POST /api/manage/blog/:slug/translate` | Azure computes, D1 stores result | Azure Translator and LLM review can be long-running |
| `POST /api/manage/categories/:id/translate` | Azure computes, D1 stores result | Azure Translator; must not write Cosmos |
| `POST /api/manage/tags/:id/translate` | Azure computes, D1 stores result | Azure Translator; must not write Cosmos |
| `POST /api/manage/blog/upload-image` | Azure computes/uploads, D1 stores manifest | Image processing and current blob/R2 pipeline |
| `POST /api/user/avatar` | Azure computes/uploads, D1 stores user avatar and manifest | Image processing and current blob/R2 pipeline |
| `DELETE /api/user/avatar` | Azure deletes media, D1 clears avatar and manifest | Image cleanup |
| `POST /api/user/page-image` | Azure computes/uploads, D1 stores manifest | Image processing and current blob/R2 pipeline |
| `POST /api/user/page/translate` | Azure computes, D1 stores result | Azure Translator |
| `POST /api/chat` | Azure streams response | LLM streaming and rate limiting |
| `POST /api/contact` | Azure sends email | Microsoft Graph and Azure AD credential |

Azure sidecar endpoints must not use Cosmos repositories after cutover. They either:

1. Receive enough request data from the Worker to do the compute and return the result to the Worker, or
2. Read needed source data from D1 through a Worker internal endpoint, then write results back through `POST /api/internal/sync`.

`/api/internal/sync` remains, but its purpose changes. It is no longer a Change Feed receiver. It becomes the authenticated write-back endpoint for Azure compute results only.

Keep `IWorkerSyncService` or rename it to `ID1SyncClient`; do not delete it while Azure compute routes still need to write results back to D1.

### Cosmos DB - retired after confidence window

During the migration window, Cosmos is frozen for writes and used only as the final export source. After production has been stable for at least one full business day:

- Disable Change Feed functions.
- Remove Azure CRUD/auth/profile repositories and services that exist only for Cosmos.
- Keep only compute-side service dependencies.
- Decommission Cosmos containers after backup/export retention is confirmed.

---

## Canonical Locale Policy

D1 stores BCP47 site locale codes everywhere, for example `bs-BA`, `de-DE`, `hr-HR`, and `en-US`.

Azure Translator codes are used only at the translator API boundary. A single mapping helper converts:

- `bs-BA` -> `bs`
- `de-DE` -> `de`
- `hr-HR` -> `hr`
- `pt-BR` -> `pt`
- `zh-Hans` -> `zh-Hans`

The Worker public read path must stop normalizing incoming site locales to translator codes for D1 lookups. It should query D1 using the BCP47 locale from the route or request.

The migration script must normalize existing translation records into BCP47 before import. If old Cosmos data stores `lang: "bs"`, it imports as D1 `locale: "bs-BA"`.

---

## Section 1 - Worker Routes

New route modules live under `src/server/routes/` and are registered in `src/server.ts`.

Existing `src/server/db/admin-routes.ts` already proves many D1 repository operations exist. The migration should split that large handler into focused route modules rather than inventing a second D1 access style.

### Route modules

```
src/server/routes/
  auth.ts             register, login, refresh, revoke, external-login, exchange-code
  blog.ts             blog CRUD, stats, translations, missing translations
  categories.ts       category CRUD and translation proxy
  tags.ts             tag CRUD and translation proxy
  case-studies.ts     case study CRUD and seed
  users.ts            user list, detail, roles, status
  roles.ts            public roles, admin roles, permissions
  profile.ts          own profile, password, page translations, API keys
  authors.ts          public/admin author profile routes
  llm.ts              provider/settings CRUD
  proxy.ts            explicit Azure compute proxy routes
```

### Admin and content routes

```
GET    /api/manage/stats

GET    /api/manage/blog
POST   /api/manage/blog
PUT    /api/manage/blog/:slug
DELETE /api/manage/blog/:slug
POST   /api/manage/blog/seed
GET    /api/manage/blog/missing-translations
GET    /api/manage/blog/:slug/translations
PUT    /api/manage/blog/:slug/translations/:locale
DELETE /api/manage/blog/:slug/translations/:locale
POST   /api/manage/blog/:slug/translate        -> Azure compute proxy
POST   /api/manage/blog/upload-image           -> Azure compute proxy

GET    /api/manage/categories
POST   /api/manage/categories
PUT    /api/manage/categories/:id
DELETE /api/manage/categories/:id
POST   /api/manage/categories/:id/translate    -> Azure compute proxy

GET    /api/manage/tags
POST   /api/manage/tags
PUT    /api/manage/tags/:id
DELETE /api/manage/tags/:id
POST   /api/manage/tags/:id/translate          -> Azure compute proxy

GET    /api/manage/case-studies
POST   /api/manage/case-studies
PUT    /api/manage/case-studies/:slug
DELETE /api/manage/case-studies/:slug
POST   /api/manage/case-studies/seed
```

Force-sync routes are removed from the admin workflow after cutover. If kept temporarily, they must be marked maintenance-only and must push D1 to D1, not Cosmos to D1.

### User, role, author, and API key routes

```
GET    /api/manage/users
GET    /api/manage/users/:id
PUT    /api/manage/users/:id/roles       requires manage:roles
PUT    /api/manage/users/:id/status      requires manage:users

GET    /api/roles
GET    /api/permissions
GET    /api/manage/roles
POST   /api/manage/roles
PUT    /api/manage/roles/:id
DELETE /api/manage/roles/:id

GET    /api/authors
GET    /api/authors/:slug
GET    /api/manage/authors
PUT    /api/manage/authors/:id

GET    /api/user/api-keys
POST   /api/user/api-keys
DELETE /api/user/api-keys/:keyId
```

### Profile routes

```
GET    /api/user/profile
PUT    /api/user/profile
POST   /api/user/change-password
POST   /api/user/avatar                 -> Azure compute proxy
DELETE /api/user/avatar                 -> Azure compute proxy
POST   /api/user/page-image             -> Azure compute proxy
GET    /api/user/page/translations
PUT    /api/user/page/translations/:locale
DELETE /api/user/page/translations/:locale
POST   /api/user/page/translate         -> Azure compute proxy
```

### LLM configuration routes

```
GET    /api/manage/llm/providers
POST   /api/manage/llm/providers
PUT    /api/manage/llm/providers/:key
DELETE /api/manage/llm/providers/:key
GET    /api/manage/llm/settings
PUT    /api/manage/llm/settings
```

### Route activation

`server.ts` should keep a single cutover switch:

- `D1_PRIMARY=false`: current behavior; admin/auth writes proxy to Azure.
- `D1_PRIMARY=true`: Worker handles D1-owned routes; only explicit compute proxy routes go to Azure.

This makes rollback an env/deploy decision rather than a broad code revert.

---

## Section 2 - Auth in Workers

### Stack

| Concern | Implementation |
|---|---|
| Password hashing | `bcryptjs` |
| JWT sign/verify | Web Crypto API, HS256 |
| Refresh tokens | D1 `refresh_tokens` table |
| API keys | D1 `api_keys` table, SHA-256 hashes |
| Microsoft OAuth | `fetch` to Microsoft token endpoint |
| Google OAuth | `fetch` to Google token endpoint |
| JWT secret | `JWT_SECRET` Worker secret |
| Admin email detection | `ADMIN_EMAILS` Worker secret |

### Secret names

Use these Worker secret names:

- `JWT_SECRET`
- `ADMIN_EMAILS`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SYNC_SECRET`

Keep `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` to match the current backend naming unless there is a separate secret migration task.

### OAuth contract

Preserve the active frontend contract for the first cutover:

1. Frontend redirects to Microsoft or Google.
2. Frontend sends the auth code to `POST /api/auth/exchange-code`.
3. Worker exchanges the code and returns the provider token response, including `id_token`.
4. Frontend sends `{ provider, idToken }` to `POST /api/auth/external-login`.
5. Worker decodes the provider ID token, upserts the D1 user, assigns roles, creates refresh token row, signs app JWT, and returns the existing `AuthResponse` shape.

This avoids changing the OAuth callback and auth context during the database cutover. A separate follow-up cleanup can collapse the two calls into one after D1 is already primary.

### JWT claims

Worker-issued JWTs must preserve the shape used by the frontend:

- `nameid` or `sub`: user id
- `email`
- `given_name`
- `family_name`
- `role`: string or array
- `permission`: string or array
- `exp`
- optional `is_first_time_setup`

The auth middleware verifies the JWT, loads fresh permissions from `user_roles -> roles.permissions`, and attaches the principal to the Hono context.

---

## Section 3 - Data Migration Script

**File:** `scripts/migrate-cosmos-to-d1.ts`

### Run modes

```bash
npx tsx scripts/migrate-cosmos-to-d1.ts --export --out scripts/data/prestage
npx tsx scripts/migrate-cosmos-to-d1.ts --export --out scripts/data/final
npx tsx scripts/migrate-cosmos-to-d1.ts --import --in scripts/data/final --remote
npx tsx scripts/migrate-cosmos-to-d1.ts --verify --in scripts/data/final --remote
```

The pre-stage export can run before the window to test transforms and imports. The final export must run after maintenance mode blocks writes.

### Export and transform coverage

The migration exports Cosmos containers and transforms them into D1 table payloads.

| Cosmos source | D1 targets |
|---|---|
| `roles` | `roles` |
| `users` | `users`, `user_roles`, `refresh_tokens` |
| `blogPosts` | `blog_posts`, `blog_post_tags` |
| `blogPostTranslations` | `blog_post_translations` |
| `categories` | `categories`, `category_translations` |
| `tags` | `tags`, `tag_translations` |
| `caseStudies` | `case_studies`, `case_study_decisions`, `case_study_results`, `case_study_translations` |
| `userPageTranslations` | `user_page_translations` |
| `processedImages` | `processed_images` |
| `apiKeys` or embedded user API keys | `api_keys` |
| `llmProviders` | `llm_providers` |
| `llmSettings` | `llm_settings` |

Rules:

- Skip documents where `_deleted: true`.
- Normalize all D1 locale fields to BCP47.
- Preserve IDs where possible so existing foreign keys and author references stay stable.
- Convert embedded arrays into join/child tables deterministically.
- Convert embedded user refresh tokens into `refresh_tokens` rows if still valid.
- Import deletes are not inferred. The final import should replace the target table contents for migrated tables.

### Import mechanics

The script generates chunked SQL files and executes them with `wrangler d1 execute --remote`.

Each table import should:

1. Run inside maintenance mode.
2. Delete existing rows for that table in dependency-safe order.
3. Insert transformed rows in chunks.
4. Stop on first failure.

Do not rely on a vague "D1 batch API" from a local Node script. If DB batching is needed, implement a temporary internal import endpoint protected by `SYNC_SECRET`, then remove it before production cutover.

### Verification

Verification must compare transformed source counts to D1 target counts, not raw Cosmos container counts. A single Cosmos document can create multiple D1 rows.

Example:

```
users                    source: 12   d1: 12   OK
user_roles               source: 18   d1: 18   OK
blog_posts               source: 47   d1: 47   OK
blog_post_tags           source: 121  d1: 121  OK
blog_post_translations   source: 705  d1: 705  OK
processed_images         source: 96   d1: 96   OK
```

Verification exits non-zero on any mismatch.

---

## Section 4 - Cutover Procedure

### Before the window

- [ ] Implement Worker D1 routes behind `D1_PRIMARY=false`.
- [ ] Implement Azure compute routes so they no longer depend on Cosmos.
- [ ] Run pre-stage export.
- [ ] Import pre-stage data into a non-production D1 database or local D1.
- [ ] Run verification against the pre-stage import.
- [ ] Deploy the new Worker to `workers.dev` with `D1_PRIMARY=true`.
- [ ] Smoke-test on `workers.dev`: register, login, Microsoft OAuth, create post, edit translation, upload image, translate blog, send contact form.
- [ ] Confirm production Worker still runs with `D1_PRIMARY=false`.

### During the window

1. Enable maintenance mode for all write endpoints.
2. Confirm write endpoints return `503` and public reads still work.
3. Run the final Cosmos export.
4. Back up the current production D1 database.
5. Import final transformed data to production D1.
6. Run verification.
7. Deploy or flip production Worker with `D1_PRIMARY=true`.
8. Smoke-test production while maintenance is still enabled.
9. Disable maintenance mode.
10. Smoke-test production writes: login, create draft post, edit profile, trigger translation, send contact form.

### Rollback

Rollback is simple only before production writes are re-enabled.

Before maintenance is disabled:

- Set `D1_PRIMARY=false`.
- Deploy Worker.
- Disable maintenance.
- Cosmos remains unchanged and Azure continues as source of truth.

After production D1 writes are accepted:

- Prefer forward-fix unless there is a severe outage.
- If rollback is required, re-enable maintenance, export D1 writes since cutover, replay or manually migrate them back to Cosmos, then set `D1_PRIMARY=false`.
- Do not describe post-write rollback as a two-minute operation.

### Post-window cleanup

Do this only after at least one full business day with successful production writes and no Cosmos reads/writes in logs:

- [ ] Disable `ChangeFeedSyncFunctions.cs`.
- [ ] Remove `ForceSyncFunction.cs` and `SyncHealthCheckFunction.cs`.
- [ ] Remove Azure auth, CRUD, profile, role, user, and LLM endpoints that are now Worker-owned.
- [ ] Remove Cosmos repositories/services that are no longer referenced.
- [ ] Keep or rename the D1 sync client used by remaining Azure compute endpoints.
- [ ] Remove Cosmos packages from `api/Api.csproj` once no remaining code references Cosmos.
- [ ] Decommission Cosmos containers after backup retention is confirmed.

---

## What Does Not Change

- Public page UI and admin UI stay on the same frontend routes.
- Public read endpoints stay on D1.
- `/img/*` image proxy stays in Workers.
- Cloudflare R2, queues, and image cache behavior stay in place.
- D1 schema stays as-is unless verification proves a missing table or column.
- API response shapes should remain compatible with existing frontend services.
- `/api/internal/sync` remains protected by `SYNC_SECRET`.

---

## Implementation Plan Shape

This is too large for one implementation plan. Split it into three plans:

1. **Worker D1 Auth and CRUD Parity**
   - Auth, permissions, route split, profile, API keys, admin CRUD, tests.
2. **Migration and Cutover Tooling**
   - Export/import/verify script, locale normalization, D1 backup, maintenance mode, smoke checklist.
3. **Azure Compute Sidecar Cleanup**
   - Remove Cosmos dependencies from remaining compute routes, keep D1 write-back, delete retired endpoints after confidence window.

Each plan must produce working software that can be tested before moving to the next one.

---

## Success Criteria

- Existing users can log in with password auth and Microsoft OAuth.
- Refresh tokens survive migration or users are intentionally forced to sign in again.
- Admin can create, update, delete, publish, and translate blog posts from D1.
- Categories, tags, case studies, authors, roles, profile data, API keys, and LLM settings are readable and writable from D1.
- Public localized blog/category/tag reads use BCP47 locales consistently.
- Image upload/avatar/page-image flows still work and write manifests to D1.
- Contact form emails are delivered through Microsoft Graph.
- Chat still streams successfully.
- Translation jobs write results to D1 without parent-not-found retries caused by ordering.
- Production logs show zero Cosmos reads/writes after cutover.
- Azure Functions are reduced to compute sidecar routes only.
