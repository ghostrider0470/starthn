# R2 Direct Image Upload Design

## Goal

Replace the Azure Blob Storage image upload pipeline with a single Worker endpoint that accepts client-produced WebP variants and writes them directly to R2, retiring three separate Azure proxy upload routes.

## Architecture

Client-side WebP conversion already works (OffscreenCanvas worker, `src/lib/image-convert.ts`). The only change is the upload destination: instead of posting to Azure, the client posts to a new Worker endpoint that writes to R2 and registers the D1 manifest atomically.

```
Before: Client (WebP) → Azure proxy → Azure Blob → (lazy) → R2
After:  Client (WebP) → POST /api/upload/image → R2 + D1 manifest
```

Old images continue to work: `image-handler.ts` still falls through to Azure Blob on R2 miss, populating R2 lazily via `IMG_WRITE_QUEUE`.

## Upload Endpoint

```
POST /api/upload/image
Authorization: Bearer <jwt>
Content-Type: multipart/form-data
```

**Fields:**

| Field | Type | Containers |
|---|---|---|
| `container` | `"blog-images" \| "avatars" \| "page-images"` | all |
| `w400` | File (WebP) | blog-images, page-images |
| `w800` | File (WebP) | blog-images, page-images |
| `w1200` | File (WebP) | blog-images, page-images |
| `w1600` | File (WebP) | blog-images, page-images |
| `w2000` | File (WebP) | blog-images, page-images |
| `w48` | File (WebP) | avatars |
| `w96` | File (WebP) | avatars |
| `w192` | File (WebP) | avatars |

No original file — WebP variants only.

**Response:**
```json
{ "path": "blog-images/{uuid}" }
```

**Auth rules:**
- Valid JWT required for all containers
- `blog-images` requires `manage:blog` permission
- `avatars` and `page-images` scope path to the authenticated user's ID

## R2 Storage and D1 Manifest

On each upload the Worker:

1. Generates `uuid` and `processed_at = new Date().toISOString()`
2. Derives `version = Math.floor(Date.now() / 1000)`
3. Writes each variant to R2:
   ```
   {container}/{uuid}/w{width}-v{version}.webp
   ```
   Avatar and page-image paths include userId:
   ```
   avatars/{userId}/{uuid}/w{width}-v{version}.webp
   page-images/{userId}/{uuid}/w{width}-v{version}.webp
   ```
4. Inserts D1 manifest row:
   ```sql
   INSERT INTO processed_images (path, container, widths, processed_at)
   VALUES ('{container}/{uuid}', '{container}', '[400,800,...]', '{now}')
   ```
5. Returns `{ path }` to the client

**Error handling:** any R2 write failure returns 500; no D1 row is inserted. Partially-written R2 objects are harmless (no manifest = never served by `image-handler.ts`).

The `version` formula matches `image-handler.ts` exactly (`Math.floor(new Date(manifest.processed_at).getTime() / 1000)`), so the handler reconstructs the correct R2 key at serve time with no changes.

## Client Changes

A new `uploadImage(variants, container)` helper in `src/services/upload.service.ts` wraps FormData construction and the `POST /api/upload/image` call. All three upload callsites use it.

**Blog images** (`src/services/blog.service.ts` → `uploadImage`):
- Was: POST to `/manage/blog/upload-image` (Azure proxy)
- Now: POST to `/api/upload/image` with `container: "blog-images"`
- Returns `path`; stored as `coverImage`/`bannerImage` on the post — no other change

**Avatars** (avatar upload UI):
- Was: POST cropped single WebP to `/api/user/avatar`
- Now: produce 3 variants (48/96/192px) via `convertToWebpVariants`, POST to `/api/upload/image` with `container: "avatars"`, then `PUT /api/user/profile` with `{ avatarUrl: path }`

**Page images** (page-image upload UI):
- Was: POST to `/api/user/page-image` (Azure proxy)
- Now: POST to `/api/upload/image` with `container: "page-images"`, use returned `path` directly

`convertToWebpVariants` already accepts any width array — avatars pass `[48, 96, 192]`.

## Avatar DELETE

`DELETE /api/user/avatar` moves from Azure proxy to `handleProfileRoute` in the Worker:
1. Resolve current `avatar_url` from D1 user record
2. Delete all R2 objects under `{avatar_url}/w*`
3. Delete D1 `processed_images` row for the path
4. Clear `avatar_url` on the user record

## What Gets Retired

| Route | Status |
|---|---|
| `POST /manage/blog/upload-image` | Removed — Azure proxy no longer needed |
| `POST /api/user/avatar` | Removed — replaced by `/api/upload/image` |
| `POST /api/user/page-image` | Removed — replaced by `/api/upload/image` |
| `DELETE /api/user/avatar` | Moved from Azure proxy to Worker |

## What Stays Unchanged

- `src/server/image-handler.ts` — serves new R2-native images and old Azure-fallback images identically; no changes needed
- `IMG_WRITE_QUEUE` consumer — retained for lazy R2 population of old migrated images; can be removed in a future cleanup once all old images have been accessed
- `src/lib/image-convert.ts` — client-side WebP conversion unchanged
- `processed_images` D1 schema — unchanged

## New Files

| File | Purpose |
|---|---|
| `src/server/routes/upload.ts` | `handleUploadRoute` — new Worker upload handler |
| `src/server/routes/upload.test.ts` | Unit tests |
| `src/services/upload.service.ts` | Client-side upload helper (shared across blog, avatar, page-image) |

## Modified Files

| File | Change |
|---|---|
| `src/server.ts` | Wire `POST /api/upload/image` through `handleD1PrimaryRoute` |
| `src/server/routes/profile.ts` | Add `DELETE /api/user/avatar` handler; remove `POST /api/user/avatar` and `POST /api/user/page-image` from proxy set |
| `src/services/blog.service.ts` | Point `uploadImage` to new endpoint via `upload.service.ts` |
| Avatar upload UI component | Use `upload.service.ts`, produce 3 variants |
| Page-image upload UI component | Use `upload.service.ts` |
