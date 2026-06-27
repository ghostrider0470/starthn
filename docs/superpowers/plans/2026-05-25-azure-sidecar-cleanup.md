# Azure Compute Sidecar Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Cosmos DB dependencies from all Azure Functions compute routes. Delete the retired CRUD/auth/profile endpoints that are now Worker-owned. Keep the D1 write-back client (renamed `ID1SyncClient`) for the compute routes that remain. Remove Cosmos packages once no code references them.

**Pre-condition:** Plans 1 and 2 complete. Production has been running with `D1_PRIMARY=true` for at least one full business day with no Cosmos reads/writes in logs. D1 is the live source of truth.

**Architecture:** Azure Functions retain only compute routes (translate, image, avatar, chat, contact). Remaining routes receive source data either in the request body (enriched by the Worker) or via a new Worker internal D1 read endpoint. All writes-back go through `POST /api/internal/sync`. Cosmos repositories/services for retired endpoints are deleted after all references are gone.

**Tech Stack:** C# Azure Functions isolated worker, .NET 8, Hono (Worker side enrichment), Vitest (Worker tests).

---

## File Map

### Worker side

| Action | File | Purpose |
|---|---|---|
| Modify | `src/server/sync-receiver.ts` | Add `userAvatar`, `userPageContent` partial-update entity handlers |
| Create | `src/server/sync-receiver.test.ts` (additions) | Tests for new entity handlers |
| Create | `src/server/routes/internal-d1.ts` | `GET /api/internal/d1/categories` and `/tags` for Azure sidecar |
| Modify | `src/server.ts` | Register internal-d1 routes; update proxy routes to enrich translate requests |

### Azure side

| Action | File | Purpose |
|---|---|---|
| Rename | `api/Services/Interfaces/IWorkerSyncService.cs` → `ID1SyncClient.cs` | Rename for post-Cosmos clarity |
| Rename | `api/Services/Implementations/WorkerSyncService.cs` → `D1SyncClient.cs` | Implementation rename |
| Modify | `api/Services/Implementations/BlogService.cs` | Remove Cosmos calls from TranslateAsync; use body-provided content |
| Modify | `api/Services/Implementations/CategoryService.cs` | Remove Cosmos calls from TranslateAsync; use body-provided data |
| Modify | `api/Services/Implementations/TagService.cs` | Remove Cosmos calls from TranslateAsync; use body-provided data |
| Modify | `api/Services/Implementations/ImageProcessingService.cs` | Replace Cosmos user writes with D1SyncClient partial-update calls |
| Modify | `api/Functions/TranslationSyncFunction.cs` | Read categories/tags from Worker internal endpoint, not Cosmos |
| Delete | `api/Functions/ChangeFeedSyncFunctions.cs` | Cosmos Change Feed triggers — no longer needed |
| Delete | `api/Functions/AuthFunctions.cs` | Auth now owned by Worker |
| Delete | `api/Functions/ApiKeyFunctions.cs` | API keys now owned by Worker |
| Delete | `api/Functions/UserManagementFunctions.cs` | User admin now owned by Worker |
| Delete | `api/Functions/RoleFunctions.cs` | Roles now owned by Worker |
| Delete | `api/Functions/LlmFunctions.cs` | LLM config now owned by Worker (keep ChatService) |
| Prune | `api/Functions/BlogFunctions.cs` | Remove CRUD endpoints; keep translate + upload-image |
| Prune | `api/Functions/CategoryFunctions.cs` | Remove CRUD; keep translate |
| Prune | `api/Functions/TagFunctions.cs` | Remove CRUD; keep translate |
| Prune | `api/Functions/CaseStudyFunctions.cs` | Remove CRUD and seed; file deleted if empty |
| Delete | Cosmos-only repos and services | See Task 6 for the full list |
| Modify | `api/Api.csproj` | Remove `Microsoft.Azure.Cosmos` and `Microsoft.Azure.WebJobs.Extensions.CosmosDB` packages |

---

### Task 1: Add partial-update entity handlers to `sync-receiver.ts`

Azure compute routes (avatar, page-image) need to write partial user updates to D1 without a full user document. Add targeted SQL UPDATE handlers for these.

**Files:**
- Modify: `src/server/sync-receiver.ts`
- Modify: `src/server/sync-receiver.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/server/sync-receiver.test.ts`:

```ts
describe('userAvatar partial update', () => {
  it('generates UPDATE for userAvatar entity', () => {
    const stmts = buildUpsertStatements('userAvatar', [{ userId: 'u1', avatarUrl: 'https://cdn.example.com/avatar.webp' }])
    expect(stmts).toHaveLength(1)
    expect(stmts[0].sql).toContain('UPDATE users SET avatar_url')
    expect(stmts[0].params).toContain('u1')
    expect(stmts[0].params).toContain('https://cdn.example.com/avatar.webp')
  })

  it('clears avatarUrl when null', () => {
    const stmts = buildUpsertStatements('userAvatar', [{ userId: 'u1', avatarUrl: null }])
    expect(stmts[0].params).toContain(null)
  })
})

describe('userPageContent partial update', () => {
  it('generates UPDATE for userPageContent entity', () => {
    const content = [{ type: 'paragraph', text: 'Hello' }]
    const stmts = buildUpsertStatements('userPageContent', [{ userId: 'u1', pageContent: content }])
    expect(stmts).toHaveLength(1)
    expect(stmts[0].sql).toContain('UPDATE users SET page_content')
    expect(stmts[0].params).toContain('u1')
    expect(stmts[0].params[0]).toBe(JSON.stringify(content))
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- sync-receiver.test
```

Expected: FAIL on new tests (entity handlers don't exist).

- [ ] **Step 3: Add handlers to `ENTITY_HANDLERS` in `src/server/sync-receiver.ts`**

Add before the closing brace of `ENTITY_HANDLERS`:

```ts
userAvatar: (item) => [{
  sql: `UPDATE users SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?`,
  params: [item.avatarUrl ?? null, item.userId],
}],

userPageContent: (item) => [{
  sql: `UPDATE users SET page_content = ?, updated_at = datetime('now') WHERE id = ?`,
  params: [typeof item.pageContent === 'string' ? item.pageContent : JSON.stringify(item.pageContent ?? []), item.userId],
}],
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm run test -- sync-receiver.test
```

Expected: all tests pass including the new ones.

- [ ] **Step 5: Commit**

```bash
git add src/server/sync-receiver.ts src/server/sync-receiver.test.ts
git commit -m "feat: add userAvatar and userPageContent partial-update sync handlers"
```

---

### Task 2: Add internal D1 read endpoint for Azure sidecar

Azure `TranslationSyncFunction` needs to read all categories and tags from D1. Expose a Worker internal endpoint protected by `SYNC_SECRET`.

**Files:**
- Create: `src/server/routes/internal-d1.ts`
- Modify: `src/server.ts`

- [ ] **Step 1: Create `src/server/routes/internal-d1.ts`**

```ts
import { createDb } from '../db/client'
import { CategoryRepository } from '../db/repositories/category'
import { TagRepository } from '../db/repositories/tag'

interface Env {
  DB: D1Database
  SYNC_SECRET: string
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function handleInternalD1Route(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url)
  const path = url.pathname

  if (!path.startsWith('/api/internal/d1/')) return null

  const secret = request.headers.get('X-Internal-Auth')
  if (secret !== env.SYNC_SECRET) return json({ error: 'unauthorized' }, 401)

  const db = createDb(env.DB)

  if (path === '/api/internal/d1/categories' && request.method === 'GET') {
    const repo = new CategoryRepository(db)
    const cats = await repo.getAll()
    return json(cats)
  }

  if (path === '/api/internal/d1/tags' && request.method === 'GET') {
    const repo = new TagRepository(db)
    const tags = await repo.getAll()
    return json(tags)
  }

  return json({ error: 'Not found' }, 404)
}
```

- [ ] **Step 2: Register in `src/server.ts`**

Add the import:
```ts
import { handleInternalD1Route } from './server/routes/internal-d1'
```

Add the route before the existing internal routes:
```ts
app.get('/api/internal/d1/*', async (c) => {
  const response = await handleInternalD1Route(c.req.raw, c.env)
  return response ?? c.json({ error: 'Not found' }, 404)
})
```

- [ ] **Step 3: Run tests + build**

```bash
npm run test && npm run build
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/server/routes/internal-d1.ts src/server.ts
git commit -m "feat: add internal D1 read endpoint for Azure sidecar (categories, tags)"
```

---

### Task 3: Rename `IWorkerSyncService` → `ID1SyncClient` in Azure

This is a mechanical rename that clarifies intent: this is no longer a "worker sync" service but a "D1 write-back client".

**Files:**
- Rename: `api/Services/Interfaces/IWorkerSyncService.cs` → `api/Services/Interfaces/ID1SyncClient.cs`
- Rename: `api/Services/Implementations/WorkerSyncService.cs` → `api/Services/Implementations/D1SyncClient.cs`
- Modify: all files that reference `IWorkerSyncService` or `WorkerSyncService`

- [ ] **Step 1: Identify all references**

```bash
grep -rl "IWorkerSyncService\|WorkerSyncService" api/
```

Expected output: the two implementation files plus `ChangeFeedSyncFunctions.cs`, `BlogFunctions.cs`, `CategoryFunctions.cs`, `TagFunctions.cs`, `ImageProcessingService.cs`, any service files, and DI registration in `Program.cs`.

- [ ] **Step 2: Rename the interface file**

Create `api/Services/Interfaces/ID1SyncClient.cs` with identical content except the interface name:

```csharp
namespace Api.Services.Interfaces;

public interface ID1SyncClient
{
    Task SyncAsync(ProcessedImageEntity entity, CancellationToken cancellationToken = default);
    Task WarmAsync(string blobPath, int[] widths, string processedAt);
    Task SyncEntityAsync(string entityType, IReadOnlyList<JsonElement> items);
    Task TrySyncOneAsync<T>(string entityType, T item);
    Task TrySyncDeleteAsync(string entityType, string id);
}
```

Delete the old `IWorkerSyncService.cs`.

- [ ] **Step 3: Rename the implementation file**

Rename `WorkerSyncService.cs` to `D1SyncClient.cs`. Update the class name to `D1SyncClient : ID1SyncClient`. Remove the old file.

- [ ] **Step 4: Update all references**

In every file that references `IWorkerSyncService` or `WorkerSyncService`:
- Replace `IWorkerSyncService` with `ID1SyncClient`
- Replace `WorkerSyncService` with `D1SyncClient`

In `Program.cs` (or wherever DI is registered):
- Replace `services.AddScoped<IWorkerSyncService, WorkerSyncService>()` with `services.AddScoped<ID1SyncClient, D1SyncClient>()`

- [ ] **Step 5: Build the Azure project**

```bash
cd api && dotnet build
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add api/
git commit -m "refactor: rename IWorkerSyncService→ID1SyncClient, WorkerSyncService→D1SyncClient"
```

---

### Task 4: Remove Cosmos reads from compute functions

Azure compute routes (translate, image upload, avatar) currently read blog posts, categories, and users from Cosmos. Update them to receive data in the request body instead.

#### 4a: Blog translate

The Worker currently returns `null` for `POST /api/manage/blog/:slug/translate`, causing it to proxy to Azure. After this task, the Worker enriches the proxy request with the post content.

**Files:**
- Modify: `src/server/db/admin-routes.ts` (change the translate fall-through)
- Modify: `api/Services/Implementations/BlogService.cs` (accept content from request body)

- [ ] **Step 1: Update the Worker to enrich translate proxy requests**

In `src/server/db/admin-routes.ts`, replace the translate fall-through:

```ts
// Before:
if (path.match(/^\/api\/manage\/blog\/[^/]+\/translate$/) && method === 'POST') {
  return null
}
```

With:

```ts
// Translate trigger — enrich with D1 post content then proxy to Azure
const translateMatch = path.match(/^\/api\/manage\/blog\/([^/]+)\/translate$/)
if (translateMatch && method === 'POST') {
  const perm = requirePermission(auth.payload, 'manage:blog')
  if (perm) return perm
  const repo = new BlogPostRepository(db)
  const post = await repo.getBySlug(translateMatch[1])
  if (!post) return err('Post not found', 404)
  // Return a sentinel so server.ts can enrich the proxy body.
  // We attach the post data as a custom header that server.ts can read.
  // Simpler approach: re-build the request with enriched JSON body.
  const originalBody = await readBody(request)
  const enriched = {
    ...originalBody,
    _postData: {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
    },
  }
  // Return enriched request signal — null means "proxy as-is",
  // but we need the enriched body to reach Azure.
  // Solution: store enriched body in a cloned request.
  return new Response('__enrich_proxy__', {
    status: 299,
    headers: {
      'X-Enrich-Body': JSON.stringify(enriched),
      'X-Proxy-Path': path,
    },
  })
}
```

Then in `src/server.ts`, update `handleD1PrimaryRoute` to detect the 299 enriched response and build the enriched Azure proxy request:

```ts
async function handleD1PrimaryRoute(c: any, handler: RouteHandler) {
  if (c.env?.D1_PRIMARY === 'true' && c.env?.DB && c.env?.JWT_SECRET) {
    try {
      const response = await handler(c.req.raw, c.env, c.executionCtx)
      if (!response) return proxyToAzure(c)
      
      // 299 = enriched proxy signal from admin route translate handler
      if (response.status === 299) {
        const enrichedBody = response.headers.get('X-Enrich-Body')
        if (enrichedBody) {
          return proxyToAzureWithBody(c, enrichedBody)
        }
      }
      
      return response
    } catch (e) {
      console.error('[d1-primary] Error, falling through to Azure:', e)
    }
  }
  return proxyToAzure(c)
}

async function proxyToAzureWithBody(c: any, bodyJson: string): Promise<Response> {
  const request = c.req.raw
  const apiOrigin = getApiOrigin(c.env)
  const url = new URL(request.url)
  const targetUrl = `${apiOrigin}${url.pathname}${url.search}`

  const headers = new Headers(request.headers)
  headers.set('Host', new URL(apiOrigin).host)
  headers.set('Content-Type', 'application/json')
  headers.delete('cf-connecting-ip')
  headers.delete('cf-ray')

  return fetch(new Request(targetUrl, {
    method: request.method,
    headers,
    body: bodyJson,
    redirect: 'manual',
  }))
}
```

- [ ] **Step 2: Update Azure `BlogService.TranslateAsync` to use enriched body**

In `api/Services/Implementations/BlogService.cs`, update `TranslateAsync` (or whichever method handles `POST /api/manage/blog/:slug/translate`):

```csharp
// Before: reads post from Cosmos
var post = await _blogRepo.GetBySlugAsync(slug);
var title = post.Title;
var content = post.Content;

// After: reads from request body's _postData field
var postData = request._postData ?? throw new NotFoundException("Post data not provided");
var title = postData.Title;
var content = postData.Content;
```

Remove the injection of `IBlogPostRepository` from the translate handler. If `IBlogPostRepository` is only used for translate, remove it from the constructor.

- [ ] **Step 3: Apply same pattern to category/tag translate**

In category and tag translate functions:
- Worker enriches proxy request with category/tag data from D1 (label + existing translations)
- Azure compute receives data in body, translates, writes back via D1SyncClient

Update `admin-routes.ts` translate fall-throughs for categories and tags similarly to the blog translate pattern above.

Update `CategoryService.cs` and `TagService.cs` to read from body instead of Cosmos repo.

- [ ] **Step 4: Update `TranslationSyncFunction.cs` to read from Worker internal endpoint**

```csharp
// Before:
var categories = await _categoryService.GetAllAsync(); // reads Cosmos

// After:
var workerOrigin = _config["WorkerOrigin"] ?? "https://starthn.ba";
var syncSecret = _config["ManifestSync:Secret"];
using var req = new HttpRequestMessage(HttpMethod.Get, $"{workerOrigin}/api/internal/d1/categories");
req.Headers.Add("X-Internal-Auth", syncSecret);
var resp = await _http.SendAsync(req);
var categories = await resp.Content.ReadFromJsonAsync<List<CategoryDto>>();
```

Apply same pattern for tags. Remove injection of `ICategoryService` and `ITagService` from this function if they're no longer used elsewhere.

- [ ] **Step 5: Update `ImageProcessingService.cs` to use `ID1SyncClient` for avatar/page-image writes**

```csharp
// Before: writes avatar URL to Cosmos user
await _userRepo.UpdateAvatarAsync(userId, avatarUrl);

// After: writes partial update to D1 via sync client
await _d1Client.TrySyncOneAsync("userAvatar", new { userId, avatarUrl });
```

Apply same pattern for page-image:
```csharp
await _d1Client.TrySyncOneAsync("userPageContent", new { userId, pageContent });
```

Remove injection of `IUserRepository` from `ImageProcessingService` if no longer used.

- [ ] **Step 6: Build Azure project**

```bash
cd api && dotnet build
```

Expected: no errors.

- [ ] **Step 7: Run smoke tests for compute routes**

```
POST /api/manage/blog/:slug/translate    → 200, translation written to D1
POST /api/manage/categories/:id/translate → 200, translation written to D1
POST /api/manage/blog/upload-image        → 200, image manifest in D1
POST /api/user/avatar                     → 200, D1 users.avatar_url updated
```

- [ ] **Step 8: Commit**

```bash
git add src/ api/
git commit -m "feat: remove Cosmos reads from translate/image compute routes — use D1 enriched proxy"
```

---

### Task 5: Delete `ChangeFeedSyncFunctions.cs`

**Pre-condition:** Production logs confirm zero Cosmos-triggered events. No Change Feed needed.

- [ ] **Step 1: Verify Cosmos Change Feed is idle**

In Azure Portal → Azure Functions → `starthn-api-prod` → Monitor:
- Confirm `SyncBlogPosts`, `SyncUsers`, etc. show no recent executions.

- [ ] **Step 2: Delete the file**

```bash
Remove-Item api/Functions/ChangeFeedSyncFunctions.cs
```

- [ ] **Step 3: Build the Azure project**

```bash
cd api && dotnet build
```

Expected: builds without errors (DI removes `ChangeFeedSyncFunctions` constructor parameters).

- [ ] **Step 4: Commit**

```bash
git add api/Functions/ChangeFeedSyncFunctions.cs
git commit -m "remove: delete ChangeFeedSyncFunctions — Cosmos is no longer source of truth"
```

---

### Task 6: Delete retired Azure endpoints and their Cosmos dependencies

These files implement routes that are now fully owned by the Worker. Delete them in two sub-tasks.

#### 6a: Delete retired function files

- [ ] **Step 1: Delete retired function files**

```bash
Remove-Item api/Functions/AuthFunctions.cs
Remove-Item api/Functions/ApiKeyFunctions.cs
Remove-Item api/Functions/UserManagementFunctions.cs
Remove-Item api/Functions/RoleFunctions.cs
Remove-Item api/Functions/LlmFunctions.cs
```

For `BlogFunctions.cs`, `CategoryFunctions.cs`, `TagFunctions.cs`, `CaseStudyFunctions.cs`: remove the CRUD methods and keep only the compute methods (translate, upload-image). If a file has no remaining methods after removal, delete the file too.

- [ ] **Step 2: Build the Azure project**

```bash
cd api && dotnet build
```

Fix any compilation errors from removed methods. The remaining compute methods have their own service dependencies — they should still compile.

- [ ] **Step 3: Commit**

```bash
git add api/Functions/
git commit -m "remove: delete auth/crud Azure endpoints — now Worker-owned"
```

#### 6b: Delete Cosmos repositories and services for retired routes

Only delete after confirming no remaining code references these.

- [ ] **Step 1: Identify and delete unused repositories**

Check each repo for remaining references:

```bash
# Run from api/ directory
foreach ($repo in @("BlogPostRepository", "UserRepository", "RoleRepository", "CaseStudyRepository", "CategoryRepository", "TagRepository", "LlmProviderRepository", "LlmSettingsRepository", "BlogPostTranslationRepository", "UserPageTranslationRepository")) {
    $count = (Get-ChildItem -Recurse -Filter "*.cs" | Select-String $repo | Where-Object { $_.Filename -ne "$repo.cs" }).Count
    Write-Host "$repo : $count references"
}
```

Delete any repository whose reference count is 0 (meaning only the file itself defines/implements it):

```bash
# Example — run only for repos with 0 external references:
Remove-Item api/Repositories/Implementations/UserRepository.cs
Remove-Item api/Repositories/Interfaces/IUserRepository.cs
# ... repeat for others confirmed unused
```

- [ ] **Step 2: Delete unused services**

Apply the same check to services. Retired services (auth, profile, role, user, LLM config):

```bash
Remove-Item api/Services/Implementations/AuthService.cs
Remove-Item api/Services/Implementations/JwtService.cs
Remove-Item api/Services/Implementations/ApiKeyService.cs
Remove-Item api/Services/Implementations/RoleService.cs
Remove-Item api/Services/Implementations/UserService.cs
Remove-Item api/Services/Implementations/LlmProviderService.cs
# Check: LlmReviewService may still be used by ChatService — confirm before deleting
```

Delete corresponding interface files in `api/Services/Interfaces/` and `api/Repositories/Interfaces/`.

- [ ] **Step 3: Clean up DI registrations in Program.cs**

Remove all `services.Add...` registrations for deleted types.

- [ ] **Step 4: Build the Azure project**

```bash
cd api && dotnet build
```

Expected: clean build with no references to deleted types.

- [ ] **Step 5: Commit**

```bash
git add api/
git commit -m "remove: delete Cosmos repositories and services for retired Azure endpoints"
```

---

### Task 7: Remove Cosmos NuGet packages from `Api.csproj`

**Pre-condition:** Zero remaining source files reference `Microsoft.Azure.Cosmos` or `CosmosDB` namespaces.

- [ ] **Step 1: Verify zero Cosmos references remain**

```bash
grep -r "Microsoft.Azure.Cosmos\|CosmosDB\|CosmosClient\|CosmosDBTrigger" api/ --include="*.cs"
```

Expected: no output.

- [ ] **Step 2: Remove packages from `api/Api.csproj`**

Remove these `<PackageReference>` lines:

```xml
<PackageReference Include="Microsoft.Azure.Cosmos" Version="..." />
<PackageReference Include="Microsoft.Azure.WebJobs.Extensions.CosmosDB" Version="..." />
```

(The exact package names depend on what's in the project file.)

- [ ] **Step 3: Build and verify**

```bash
cd api && dotnet build
```

Expected: builds without Cosmos packages.

Also remove `@azure/cosmos` from the frontend `package.json` devDependencies (it was only used by the migration script, which is now a one-time tool — move it to a comment or keep it for re-runs):

Actually, keep `@azure/cosmos` in devDependencies since the migration script may need to be re-run for debugging. Remove it only after the migration is confirmed complete and the script is archived.

- [ ] **Step 4: Commit**

```bash
git add api/Api.csproj
git commit -m "remove: drop Cosmos NuGet packages — D1 is now the only database"
```

---

### Task 8: Post-cutover smoke test checklist

Run this after Plan 3 is deployed to production.

- [ ] Confirm `ChangeFeed*` Azure Functions show **Disabled** in Azure Portal
- [ ] Verify zero Cosmos RU consumption in Cosmos DB Metrics for the past 24 hours
- [ ] Run full end-to-end smoke test:
  - [ ] `POST /api/auth/login` → 200 (Worker handles from D1)
  - [ ] `POST /api/auth/external-login` (Microsoft OAuth) → 200 (Worker handles)
  - [ ] `GET /api/manage/blog` → 200 (Worker, from D1)
  - [ ] `PUT /api/manage/blog/:slug` → 200 (Worker, writes to D1 only)
  - [ ] `POST /api/manage/blog/:slug/translate` → 200 (Azure compute writes to D1 via /api/internal/sync)
  - [ ] `POST /api/manage/blog/upload-image` → 200 (Azure compute writes manifest to D1)
  - [ ] `POST /api/user/avatar` → 200 (Azure writes userAvatar partial update to D1)
  - [ ] `GET /api/user/profile` → 200 (Worker, from D1)
  - [ ] `POST /api/chat` → 200, streams (Azure compute, no DB)
  - [ ] `POST /api/contact` → 200, email delivered (Azure compute, Microsoft Graph)
  - [ ] `GET /bs-BA/blog/[slug]` → 200, Bosnian content loads (D1 BCP47 locale)
  - [ ] `GET /api/blog` → 200 (D1 public read)
- [ ] Confirm zero `CosmosException` in Azure Application Insights for the past 24 hours
- [ ] Archive the migration export data (`scripts/data/final/`) to cold storage (e.g., Azure Blob)
- [ ] Remove sync buttons from admin UI (the per-post Sync and Sync All buttons added earlier — these are no longer needed after full D1 ownership)
- [ ] Open an issue to decommission Cosmos containers after 30-day retention period

---

**Plan 3 complete.** Azure Functions are reduced to compute sidecar routes only (translate, image, avatar, chat, contact). D1 is the sole persistent storage layer. Cosmos containers can be decommissioned after the retention window.
