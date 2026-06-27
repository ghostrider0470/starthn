# R2 Direct Image Upload — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all Azure Blob image upload routes with a single Worker endpoint that writes client-produced WebP variants directly to R2 and registers the D1 manifest atomically.

**Architecture:** A new `POST /api/upload/image` Worker handler accepts multipart FormData (container name + WebP variant files), writes each variant to R2 as `{path}/w{width}-v{version}.webp`, inserts a `processed_images` D1 row, and returns `{ path, url }`. Three client upload callsites (blog images, avatars, page-images) are unified through a shared `upload.service.ts` helper. The existing `image-handler.ts` is untouched — it already reads R2 keys in this exact format.

**Tech Stack:** Cloudflare Workers, R2 (`IMG_CACHE` binding), D1 (`processedImages` table via Drizzle), Hono, Vitest, TypeScript.

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Create | `src/server/routes/upload.ts` | `handleUploadRoute` — auth, R2 writes, D1 manifest |
| Create | `src/server/routes/upload.test.ts` | Unit tests for upload handler |
| Modify | `src/server.ts` | Wire `POST /api/upload/image` via `handleD1PrimaryRoute` |
| Create | `src/services/upload.service.ts` | Shared client helper: variant conversion + POST |
| Modify | `src/services/blog.service.ts` | Replace `uploadImage` to use `upload.service.ts` |
| Modify | `src/services/profile.service.ts` | Replace `uploadAvatar` to use `upload.service.ts` |
| Modify | `src/routes/{-$locale}/my-page.tsx` | Replace `handleImageUpload` to use `upload.service.ts` |
| Modify | `src/server/routes/profile.ts` | Remove avatar/page-image from proxy set; add `DELETE /api/user/avatar` |
| Modify | `src/server/db/admin-routes.ts` | Remove `/manage/blog/upload-image` null-proxy handler |

---

### Task 1: Create Worker upload handler

**Files:**
- Create: `src/server/routes/upload.ts`
- Create: `src/server/routes/upload.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/server/routes/upload.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { handleUploadRoute } from './upload'
import { signJwt } from '../auth'

const SECRET = 'test-secret-at-least-32-characters!!'

async function token(extra: Record<string, any> = {}) {
  return signJwt(
    { sub: 'user-1', email: 'a@b.com', permission: [], role: [], ...extra },
    SECRET,
    3600,
  )
}

function makeEnv(overrides: Record<string, any> = {}) {
  const put = vi.fn().mockResolvedValue(undefined)
  const prepare = vi.fn(() => ({
    bind: () => ({
      first: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue({ results: [] }),
      run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
    }),
  }))
  return { DB: { prepare } as any, IMG_CACHE: { put } as any, JWT_SECRET: SECRET, ...overrides }
}

describe('handleUploadRoute', () => {
  it('returns null for non-upload paths', async () => {
    const req = new Request('https://x/api/auth/login', { method: 'POST' })
    expect(await handleUploadRoute(req, makeEnv() as any)).toBeNull()
  })

  it('returns null for GET requests', async () => {
    const req = new Request('https://x/api/upload/image', { method: 'GET' })
    expect(await handleUploadRoute(req, makeEnv() as any)).toBeNull()
  })

  it('returns 401 without Authorization header', async () => {
    const req = new Request('https://x/api/upload/image', { method: 'POST' })
    const res = await handleUploadRoute(req, makeEnv() as any)
    expect(res?.status).toBe(401)
  })

  it('returns 400 for invalid container', async () => {
    const t = await token()
    const fd = new FormData()
    fd.append('container', 'invalid-container')
    const req = new Request('https://x/api/upload/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: fd,
    })
    const res = await handleUploadRoute(req, makeEnv() as any)
    expect(res?.status).toBe(400)
  })

  it('returns 403 for blog-images without manage:blog permission', async () => {
    const t = await token({ permission: [] })
    const fd = new FormData()
    fd.append('container', 'blog-images')
    const req = new Request('https://x/api/upload/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: fd,
    })
    const res = await handleUploadRoute(req, makeEnv() as any)
    expect(res?.status).toBe(403)
  })

  it('returns 400 when no variant files are provided', async () => {
    const t = await token()
    const fd = new FormData()
    fd.append('container', 'avatars')
    const req = new Request('https://x/api/upload/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: fd,
    })
    const res = await handleUploadRoute(req, makeEnv() as any)
    expect(res?.status).toBe(400)
  })

  it('returns 200 with path and url for valid avatar upload', async () => {
    const t = await token({ sub: 'user-1' })
    const fd = new FormData()
    fd.append('container', 'avatars')
    fd.append('w48', new Blob(['px'], { type: 'image/webp' }), 'w48.webp')
    fd.append('w96', new Blob(['px'], { type: 'image/webp' }), 'w96.webp')
    fd.append('w192', new Blob(['px'], { type: 'image/webp' }), 'w192.webp')
    const req = new Request('https://x/api/upload/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: fd,
    })
    const env = makeEnv()
    const res = await handleUploadRoute(req, env as any)
    expect(res?.status).toBe(200)
    const body = await res!.json() as { path: string; url: string }
    expect(body.path).toMatch(/^avatars\/user-1\/[a-f0-9]+$/)
    expect(body.url).toBe(`/img/${body.path}`)
    expect((env.IMG_CACHE.put as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(3)
  })

  it('scopes blog-images path without userId', async () => {
    const t = await token({ sub: 'user-1', permission: ['manage:blog'] })
    const fd = new FormData()
    fd.append('container', 'blog-images')
    fd.append('w400', new Blob(['px'], { type: 'image/webp' }), 'w400.webp')
    const req = new Request('https://x/api/upload/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: fd,
    })
    const env = makeEnv()
    const res = await handleUploadRoute(req, env as any)
    expect(res?.status).toBe(200)
    const body = await res!.json() as { path: string }
    expect(body.path).toMatch(/^blog-images\/[a-f0-9]+$/)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test -- --reporter=verbose routes/upload.test
```

Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/server/routes/upload.ts`**

```ts
import { createDb } from '../db/client'
import { processedImages } from '../db/schema'
import { verifyJwt } from '../auth'

interface UploadEnv {
  DB: D1Database
  IMG_CACHE: R2Bucket
  JWT_SECRET: string
}

const CONTAINER_WIDTHS: Record<string, number[]> = {
  'blog-images': [400, 800, 1200, 1600, 2000],
  'avatars': [48, 96, 192],
  'page-images': [400, 800, 1200, 1600, 2000],
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function handleUploadRoute(
  request: Request,
  env: UploadEnv,
): Promise<Response | null> {
  if (request.method !== 'POST') return null
  if (new URL(request.url).pathname !== '/api/upload/image') return null
  if (!env?.DB || !env?.IMG_CACHE || !env?.JWT_SECRET) return null

  // Auth
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
  const payload = await verifyJwt(authHeader.slice(7), env.JWT_SECRET)
  if (!payload?.sub) return json({ error: 'Unauthorized' }, 401)

  // Parse form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return json({ error: 'Invalid form data' }, 400)
  }

  const container = formData.get('container') as string | null
  if (!container || !CONTAINER_WIDTHS[container]) {
    return json({ error: 'Invalid container' }, 400)
  }

  // Permission check
  if (container === 'blog-images' && !payload.permission?.includes('manage:blog')) {
    return json({ error: 'Forbidden' }, 403)
  }

  // Build base path — avatars and page-images are scoped to userId
  const uuid = crypto.randomUUID().replace(/-/g, '')
  const userId = payload.sub
  const basePath =
    container === 'avatars' || container === 'page-images'
      ? `${container}/${userId}/${uuid}`
      : `${container}/${uuid}`

  const now = new Date().toISOString()
  const version = Math.floor(Date.now() / 1000)
  const uploadedWidths: number[] = []

  // Write each variant to R2
  for (const width of CONTAINER_WIDTHS[container]) {
    const file = formData.get(`w${width}`) as File | null
    if (!file) continue
    const r2Key = `${basePath}/w${width}-v${version}.webp`
    await env.IMG_CACHE.put(r2Key, await file.arrayBuffer(), {
      httpMetadata: { contentType: 'image/webp' },
    })
    uploadedWidths.push(width)
  }

  if (uploadedWidths.length === 0) return json({ error: 'No variants provided' }, 400)

  // Register D1 manifest
  const db = createDb(env.DB)
  await db.insert(processedImages).values({
    path: basePath,
    container,
    format: 'webp',
    widths: JSON.stringify(uploadedWidths),
    processedAt: now,
    source: 'worker',
  })

  return json({ path: basePath, url: `/img/${basePath}` })
}
```

**IMPORTANT:** Check if `processedImages` is exported from `src/server/db/schema.ts` using that exact name. If the export name differs, adjust the import. Also confirm the Drizzle column names match — the schema has `processedAt` (camelCase) mapping to `processed_at`, and `source` column.

- [ ] **Step 4: Run — expect PASS**

```bash
npm run test -- --reporter=verbose routes/upload.test
```

Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/upload.ts src/server/routes/upload.test.ts
git commit -m "feat: add R2 direct image upload Worker handler"
```

---

### Task 2: Wire `/api/upload/image` in `src/server.ts`

**Files:**
- Modify: `src/server.ts`

- [ ] **Step 1: Read `src/server.ts`**

Find where `handleAuthRoute` and `handleProfileRoute` are imported at the top. Note the `handleD1PrimaryRoute` helper and how existing routes are registered (around lines 71–93).

- [ ] **Step 2: Add import**

Add after the existing route handler imports:

```ts
import { handleUploadRoute } from './server/routes/upload'
```

- [ ] **Step 3: Register the route**

Add before `app.all('/api/user/*', ...)` (it must come before the catch-all `/api/*`):

```ts
app.post('/api/upload/image', (c) => handleD1PrimaryRoute(c, handleUploadRoute))
```

- [ ] **Step 4: Run all tests**

```bash
npm run test -- --reporter=verbose
```

Expected: all tests pass, no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/server.ts
git commit -m "feat: wire POST /api/upload/image through D1_PRIMARY routing"
```

---

### Task 3: Create shared client upload service

**Files:**
- Create: `src/services/upload.service.ts`

- [ ] **Step 1: Read `src/services/blog.service.ts`**

Find how the `api` client is imported at the top (e.g., `import { api } from './api'` or `import api from '@/lib/api'`). Note the exact import path — use the same one in `upload.service.ts`.

Also read `src/lib/image-convert.ts` lines 1-30 to confirm the `convertToWebpVariants` signature:
```ts
convertToWebpVariants(file: File, options?: { widths?: readonly number[]; quality?: number }): Promise<Array<{ width: number; blob: Blob }>>
```

- [ ] **Step 2: Create `src/services/upload.service.ts`**

```ts
import { convertToWebpVariants } from '@/lib/image-convert'
import { api } from './api' // adjust this import to match how other services import api
```

**IMPORTANT:** Replace `'./api'` with the actual import path used in `blog.service.ts`.

```ts
import { convertToWebpVariants } from '@/lib/image-convert'
// Use whichever import matches blog.service.ts:
import { api } from './api'

const CONTAINER_WIDTHS = {
  'blog-images': [400, 800, 1200, 1600, 2000],
  'avatars': [48, 96, 192],
  'page-images': [400, 800, 1200, 1600, 2000],
} as const

type Container = keyof typeof CONTAINER_WIDTHS

export interface UploadResult {
  path: string
  url: string
}

export async function uploadImage(file: File, container: Container): Promise<UploadResult> {
  const widths = CONTAINER_WIDTHS[container]
  const variants = await convertToWebpVariants(file, { widths })

  const formData = new FormData()
  formData.append('container', container)
  for (const v of variants) {
    formData.append(`w${v.width}`, v.blob, `w${v.width}.webp`)
  }

  const res = await api.post<UploadResult>('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
npm run build 2>&1 | head -30
```

Fix any import errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/upload.service.ts
git commit -m "feat: add shared client upload service for R2 direct upload"
```

---

### Task 4: Update blog image upload

**Files:**
- Modify: `src/services/blog.service.ts`

- [ ] **Step 1: Read `src/services/blog.service.ts` lines 130-160**

Note the full `uploadImage` method (lines 134-152). It currently:
- Appends `original` + `variant_400`/`variant_800`/... to FormData
- Posts to `/manage/blog/upload-image`
- Returns `{ url: string }`

- [ ] **Step 2: Replace `uploadImage` in `blog.service.ts`**

Add this import at the top of the file (with existing imports):
```ts
import { uploadImage as uploadImageToR2 } from './upload.service'
```

Replace the entire `uploadImage` method with:

```ts
async uploadImage(file: File): Promise<{ url: string }> {
  const result = await uploadImageToR2(file, 'blog-images')
  return { url: result.url }
}
```

The return shape stays `{ url: string }` so the existing callers in `blog_.editor.tsx` need no changes — the `/img/{path}` URL works as a drop-in for the old Azure blob URL.

- [ ] **Step 3: Build to verify TypeScript**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/blog.service.ts
git commit -m "feat: update blog image upload to use R2 direct upload"
```

---

### Task 5: Update avatar upload

**Files:**
- Modify: `src/services/profile.service.ts`

- [ ] **Step 1: Read `src/services/profile.service.ts` lines 80-100**

Note the `uploadAvatar` method. It currently posts a single file to `/user/avatar` and returns `{ avatarUrl: string }`.

Also note how `api.put` is called elsewhere in this file (for profile update) — we need to call `PUT /user/profile` with `{ avatarUrl: path }` after upload.

- [ ] **Step 2: Replace `uploadAvatar` in `profile.service.ts`**

Add import at the top:
```ts
import { uploadImage } from './upload.service'
```

Replace `uploadAvatar`:

```ts
async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const result = await uploadImage(file, 'avatars')
  // Persist the new avatar path on the user profile
  await api.put('/user/profile', { avatarUrl: result.path })
  return { avatarUrl: result.url }
}
```

**Note:** The caller receives `{ avatarUrl: string }` where the URL is `/img/avatars/{userId}/{uuid}`. This is a drop-in for the previous Azure URL, so UI components displaying the avatar need no changes.

- [ ] **Step 3: Build to verify TypeScript**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/services/profile.service.ts
git commit -m "feat: update avatar upload to use R2 direct upload"
```

---

### Task 6: Update page-image upload

**Files:**
- Modify: `src/routes/{-$locale}/my-page.tsx`

- [ ] **Step 1: Read the page-image upload section**

Search for `handleImageUpload` or `/user/page-image` in `src/routes/{-$locale}/my-page.tsx`. Note the full function and how its return value is used (what happens with the returned `url`).

- [ ] **Step 2: Add import and replace `handleImageUpload`**

Add at the top of the file with existing imports:
```ts
import { uploadImage } from '@/services/upload.service'
```

Replace the existing `handleImageUpload` function with:

```ts
async function handleImageUpload(file: File): Promise<{ url: string }> {
  const result = await uploadImage(file, 'page-images')
  return { url: result.url }
}
```

The return shape stays `{ url: string }` for backward compat with the caller.

- [ ] **Step 3: Build to verify TypeScript**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add "src/routes/{-$locale}/my-page.tsx"
git commit -m "feat: update page-image upload to use R2 direct upload"
```

---

### Task 7: Retire Azure proxy routes and add avatar DELETE

**Files:**
- Modify: `src/server/routes/profile.ts`
- Modify: `src/server/db/admin-routes.ts`

- [ ] **Step 1: Read `src/server/routes/profile.ts` lines 19-45**

Note the `AZURE_PROXY_PATHS` set and the `if (path.startsWith('/api/user/avatar')) return null` line.

- [ ] **Step 2: Update `AZURE_PROXY_PATHS` in `profile.ts`**

Remove `/api/user/avatar` and `/api/user/page-image` from the set. Keep `/api/user/page/translate`. Replace:

```ts
const AZURE_PROXY_PATHS = new Set([
  '/api/user/page/translate',
])
```

Also remove the line:
```ts
if (path.startsWith('/api/user/avatar')) return null
```

- [ ] **Step 3: Add `DELETE /api/user/avatar` handler in `profile.ts`**

Inside the `try` block, add after the existing profile handlers:

```ts
// Delete avatar
if (path === '/api/user/avatar' && method === 'DELETE') {
  const user = await userRepo.getById(userId)
  if (user?.avatarUrl) {
    // List and delete all R2 objects under the avatar path
    const r2Prefix = user.avatarUrl.startsWith('/img/')
      ? user.avatarUrl.slice(5)   // strip /img/
      : user.avatarUrl
    const listed = await (env as any).IMG_CACHE.list({ prefix: r2Prefix })
    await Promise.all(
      (listed.objects ?? []).map((obj: { key: string }) =>
        (env as any).IMG_CACHE.delete(obj.key)
      )
    )
    // Remove D1 manifest
    await env.DB.prepare('DELETE FROM processed_images WHERE path = ?')
      .bind(r2Prefix)
      .run()
    // Clear avatarUrl on user
    await userRepo.updateProfile(userId, { avatarUrl: null } as any)
  }
  return new Response(null, { status: 204 })
}
```

**Note:** `ProfileEnv` needs `IMG_CACHE` added. Update the interface at the top of `profile.ts`:

```ts
interface ProfileEnv {
  DB: D1Database
  JWT_SECRET: string
  IMG_CACHE?: R2Bucket
}
```

- [ ] **Step 4: Remove `upload-image` null-proxy from `admin-routes.ts`**

Find the block in `src/server/db/admin-routes.ts` (around lines 179-182):
```ts
// Blog image upload — needs R2 or Azure blob, proxy to Azure
if (path === '/api/manage/blog/upload-image' && method === 'POST') {
  return null
}
```

Delete these lines entirely. The route is now handled by `/api/upload/image` and the old Azure path is retired.

- [ ] **Step 5: Run all tests**

```bash
npm run test -- --reporter=verbose
```

Expected: all pass.

- [ ] **Step 6: Build**

```bash
npm run build 2>&1 | head -30
```

Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/server/routes/profile.ts src/server/db/admin-routes.ts
git commit -m "feat: retire Azure upload proxy routes, add avatar DELETE to Worker"
```

---

### Task 8: Manual smoke test

These steps verify the full end-to-end pipeline with `D1_PRIMARY=true`.

- [ ] **Step 1: Start local dev server**

```bash
npx wrangler dev --var D1_PRIMARY:true
```

- [ ] **Step 2: Test blog image upload**

In the admin editor (`http://127.0.0.1:8787/admin/blog`), open any post and upload a cover image. Expected:
- Network tab shows `POST /api/upload/image` with `container: blog-images`
- Response: `{ path: "blog-images/...", url: "/img/blog-images/..." }`
- Cover image displays correctly in the editor

- [ ] **Step 3: Test avatar upload**

Go to profile settings, upload a new avatar. Expected:
- `POST /api/upload/image` with `container: avatars`
- Followed by `PUT /api/user/profile` with `{ avatarUrl: "avatars/..." }`
- Avatar displays in the UI

- [ ] **Step 4: Test page-image upload**

Go to your public page editor, upload a page image. Expected:
- `POST /api/upload/image` with `container: page-images`
- Image displays correctly

- [ ] **Step 5: Verify image serving**

After upload, navigate to the blog post preview. Expected:
- Images load via `/img/blog-images/...`
- No 404s, no Azure fallback (check `X-Cache` response header — should be `R2` on second load)
