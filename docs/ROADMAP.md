# Horizon Tech — Roadmap

> Technical roadmap for the Horizon Tech platform. Updated 2026-04-11.

---

## Completed

### Phase 0 — Foundation (Feb–Mar 2026)
- [x] .NET 10 Azure Functions API (auth, blog, users, roles, LLM chat, image processing)
- [x] React frontend with Vite
- [x] MongoDB (Cosmos MongoDB API) for document storage
- [x] Azure Blob Storage for images
- [x] JWT auth (HS256) with refresh tokens

### LLM Chatbot (Apr 2)
- [x] Streaming chat with configurable LLM providers (Azure OpenAI, Anthropic)
- [x] Provider/model management admin UI
- Spec: `docs/superpowers/specs/2026-04-02-llm-chatbot-design.md`

### TanStack Start + Cloudflare Workers Migration (Apr 4)
- [x] Migrate from Vite SPA to TanStack Start SSR on Cloudflare Workers
- [x] Hono router: SSR, image handler, D1 reads, Azure API proxy
- [x] File-based routing, full hydration, i18n (136 languages)
- Spec: `docs/superpowers/specs/2026-04-04-tanstack-start-cloudflare-migration-design.md`

### D1 Schema + Data Layer (Apr 5)
- [x] 19-table D1 schema for edge reads (blog posts, categories, tags, users, translations)
- [x] SSR data fetchers read D1 directly during server render
- [x] D1 API routes replace Azure proxy for public GET endpoints
- Plan: `docs/superpowers/plans/2026-04-05-d1-schema-data-layer.md`

### Image Optimization + R2 Pipeline (Apr 5–7)
- [x] ImageSharp-based server-side WebP conversion (w400, w800, w1200)
- [x] R2 as edge image cache (lazy-fill from Azure Blob variants)
- [x] Circuit breaker for Azure Blob fallback
- [x] Cloudflare Queue for durable R2 writes
- [x] Proactive R2 warming after upload
- Plans: `docs/superpowers/plans/2026-04-05-image-optimization.md`, `2026-04-07-image-pipeline-r2.md`

### Sync Reliability — Phase 1: R2 Hardening (Apr 9)
- [x] Circuit breaker for Azure Blob fallback
- [x] Cloudflare Queue (`img-r2-writes`) for durable R2 writes
- [x] Staleness detection on image handler
- [x] Proactive R2 warming endpoint on Worker
- Plan: `docs/superpowers/plans/2026-04-09-sync-reliability.md` (Tasks 1–5)

### Sync Reliability — Phase 2: Cosmos DB NoSQL Migration (Apr 9–11)
- [x] Swap MongoDB.Driver → Microsoft.Azure.Cosmos SDK (serverless)
- [x] Rewrite 10 entities (BSON → System.Text.Json), 9 repositories, all services
- [x] Extract translations into separate containers (1,614 blog + 15 user docs)
- [x] Cosmos account `horizon-cosmos` (serverless, North Europe, 12 containers)
- [x] Data migration (68 base + 1,629 translation docs), deployed to `ht-func-prod`
- Plan: `docs/superpowers/plans/2026-04-09-sync-reliability.md` (Tasks 6–11)

---

## In Progress

### Sync Reliability — Phase 3: Change Feed Sync (Tasks 12–13)
- [ ] Cosmos DB Change Feed Trigger Functions (6 triggers: blogPosts, categories, tags, users, roles, caseStudies)
- [ ] Rename ManifestSyncService → WorkerSyncService with generalized `SyncEntityAsync`
- [ ] Generalized `/api/internal/sync` endpoint on Worker (entity-type routing, D1 upsert)
- [ ] **Critical**: this is what makes admin writes visible on the public site (Cosmos → D1)
- Plan: `docs/superpowers/plans/2026-04-09-sync-reliability.md` (Tasks 12–13)

---

## Planned

### Sync Reliability — Phase 4–6: Observability + Deploy (Tasks 14–17)
- [ ] Health endpoint (`/api/internal/health`) with D1 staleness check
- [ ] Alerting timer function (periodic Cosmos→D1 drift detection)
- [ ] Remove old sync paths (ManifestSyncService legacy, ImageSweepFunction manual sync)
- [ ] Full deploy: Worker + Azure Function + wrangler config
- Plan: `docs/superpowers/plans/2026-04-09-sync-reliability.md` (Tasks 14–17)

### Security Debt
- [ ] Rotate Azure SQL password (`htadmin` on `ht-sql-prod.database.windows.net`) — leaked in git history
- [ ] Remove `MONGODB_CONNECTION_STRING` from `ht-func-prod` app settings after Cosmos is stable
- [ ] Audit git history for other leaked credentials

### Infrastructure Cleanup
- [ ] Delete or downscale the old Cosmos MongoDB API cluster (`ht-cosmos-prod.mongocluster.cosmos.azure.com`) after Phase 3 is stable
- [ ] Clean up worktree at `C:\Development\horizon-frontend-phase2`
- [ ] Merge `develop` → `master` when full pipeline is verified (CI auto-deploys)

### Future Considerations
- [ ] Cosmos SDK v4 migration (drop Newtonsoft.Json dependency when v4 goes GA)
- [ ] Composite indexes on Cosmos containers for cross-partition query optimization
- [ ] User page translations extraction (same pattern as blog translations — lower priority, smaller data)
- [ ] Real-time sync via WebSocket/SSE for admin panel (immediate feedback on D1 sync status)

---

## Architecture Reference

See `docs/ARCHITECTURE.md` for the full system diagram.

**Data flow (target state after Phase 3):**
```
Admin write → Azure Function → Cosmos DB
                                   │
                          Change Feed Trigger
                                   │
                          WorkerSyncService
                                   │
                    POST /api/internal/sync
                                   │
                          Cloudflare Worker
                                   │
                              D1 upsert
                                   │
                          Public reads (SSR)
```
