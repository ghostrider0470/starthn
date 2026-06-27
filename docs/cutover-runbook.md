# Cutover Runbook

## Prerequisites
- [ ] Plan 1 deployed (D1_PRIMARY=false on production)
- [ ] Plan 2 deployed (maintenance mode + migration script ready)
- [ ] Pre-stage import verified (no transform errors)
- [ ] Logged in to Cloudflare (`npx wrangler whoami`) and Azure CLI (`az account show`)
- [ ] Cosmos env vars set (see Step 3)

## Window (estimated: 30–60 minutes)

### 1. Enable maintenance mode
```bash
npx wrangler deploy --var MAINTENANCE_MODE:true
```
Verify: `curl -X POST https://starthn.ba/api/manage/blog` → 503

### 2. Confirm public reads still work
Open `https://starthn.ba/bs-BA/blog` in browser — blog list loads.

### 3. Set Cosmos env vars
```bash
export COSMOS_ENDPOINT=https://starthn-cosmos.documents.azure.com:443/
export COSMOS_KEY=<get from Azure Portal → starthn-cosmos → Keys>
export COSMOS_DATABASE=starthn
```

### 4. Run final Cosmos export
```bash
npx tsx scripts/migrate-cosmos-to-d1.ts --export --out scripts/data/final
```
Expected: one JSON file per container in `scripts/data/final/`.

### 5. Back up production D1
```bash
npx wrangler d1 export starthn-db --remote --output "scripts/data/d1-backup-$(Get-Date -Format yyyyMMdd).sql"
```

### 6. Import final data to production D1
```bash
npx tsx scripts/migrate-cosmos-to-d1.ts --import --in scripts/data/final --remote
```

### 7. Verify row counts
```bash
npx tsx scripts/migrate-cosmos-to-d1.ts --verify --in scripts/data/final --remote
```
Must exit 0 (all counts match).

### 8. Deploy with D1_PRIMARY=true (maintenance still on)
```bash
npx wrangler deploy --var D1_PRIMARY:true --var MAINTENANCE_MODE:true
```

### 9. Smoke test reads (maintenance still enabled)
- [ ] `GET /api/manage/blog` → 200 (list from D1)
- [ ] `GET /api/blog` → 200 (public read)
- [ ] `GET /bs-BA/blog/...` → Bosnian content loads
- [ ] `GET /api/authors` → 200

### 10. Disable maintenance mode
```bash
npx wrangler deploy --var D1_PRIMARY:true --var MAINTENANCE_MODE:false
```

### 11. Final smoke test (writes enabled)
- [ ] `POST /api/auth/login` → 200 with JWT
- [ ] Microsoft OAuth login → works end-to-end
- [ ] Create draft blog post → 201
- [ ] Edit profile → 200
- [ ] Upload avatar → 200, image appears
- [ ] `POST /api/contact` → email delivered

## Rollback (before step 10 — writes not yet re-enabled)
```bash
npx wrangler deploy --var D1_PRIMARY:false --var MAINTENANCE_MODE:false
```
Cosmos is unchanged. Azure continues as source of truth. No data is lost.

## Post-window (after 1 full business day)
See Plan 3 (`docs/superpowers/plans/2026-05-25-azure-sidecar-cleanup.md`) — retire Azure Compute sidecar once D1 has proven stable.
