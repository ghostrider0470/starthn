# Image Lifecycle System Design

**Date:** 2026-04-11
**Status:** Approved

## Problem

All images (blog, avatar, page) are stored in a single `blog-images` Azure Blob container with no user/post association in paths. Replaced images are orphaned indefinitely. Avatars have no variant processing and no remove functionality. There is no structured lifecycle for image creation, replacement, or deletion.

## Design

### Storage Architecture

Three Azure Blob containers with distinct naming conventions:

| Container | Path Pattern | Variants |
|-----------|-------------|----------|
| `avatars` | `{userId}/{guid}.webp` | 48, 96, 192 |
| `page-images` | `{userId}/{guid}.webp` | 400, 800, 1200, 1600, 2000 |
| `blog-images` | `{slug}/{guid}.webp` | 400, 800, 1200, 1600, 2000 |

Variant paths follow the existing convention: `{original}/w{width}.webp`

Example full paths:
```
avatars/abc123/f47ac10b.webp
avatars/abc123/f47ac10b/w48.webp
avatars/abc123/f47ac10b/w96.webp
avatars/abc123/f47ac10b/w192.webp

blog-images/my-first-post/e3b0c442.webp
blog-images/my-first-post/e3b0c442/w400.webp
blog-images/my-first-post/e3b0c442/w800.webp
...

page-images/abc123/d4e5f6a7.webp
page-images/abc123/d4e5f6a7/w400.webp
...
```

### R2 Cache

Single `IMG_CACHE` R2 bucket mirrors all three containers. The container name is a prefix in the R2 key:

```
avatars/{userId}/{guid}/w96-v{timestamp}.webp
blog-images/{slug}/{guid}/w800-v{timestamp}.webp
page-images/{userId}/{guid}/w1200-v{timestamp}.webp
```

No separate R2 buckets needed.

### Metadata Storage

**Cosmos DB (`processedImages` container):**

Documents gain a `container` field:
```json
{
  "id": "avatars/abc123/f47ac10b",
  "container": "avatars",
  "path": "avatars/abc123/f47ac10b",
  "format": "webp",
  "widths": [48, 96, 192],
  "processedAt": "2026-04-11T12:00:00Z",
  "source": "backend"
}
```

**D1 (`processed_images` table):**

New `container` column:
```sql
ALTER TABLE processed_images ADD COLUMN container TEXT NOT NULL DEFAULT 'blog-images';
```

### DB URL Format

URLs stored in Cosmos/D1 switch from full Azure URLs to **relative paths**:
- Old: `https://htstorageprod.blob.core.windows.net/blog-images/2026/04/guid-file.png`
- New: `blog-images/my-first-post/e3b0c442.webp`

The `img()` utility already strips the origin, so this is a formalization of existing behavior.

---

## Upload & Delete Flows

### Avatar Upload (`POST /user/avatar`)

1. Client crops image, sends to endpoint
2. Backend extracts `userId` from auth token
3. Reads current `avatarUrl` from user document to get old blob path
4. Uploads new original to `avatars/{userId}/{guid}.webp`
5. Generates variants (48, 96, 192) via ImageSharp, uploads to `avatars/{userId}/{guid}/w{size}.webp`
6. Deletes old blob + old variants from Azure (if old path exists)
7. Upserts manifest to Cosmos `processedImages` with `container: "avatars"`
8. Deletes old manifest from Cosmos (if different path)
9. Updates user document `avatarUrl` to new relative path
10. Fire-and-forget: sync manifest to D1, warm R2 for widths [96, 192]
11. Returns `{ avatarUrl: "avatars/{userId}/{guid}.webp" }`

### Avatar Remove (`DELETE /user/avatar`) — NEW

1. Client calls `DELETE /user/avatar`
2. Backend reads current `avatarUrl` from user document
3. Deletes blob + variants from Azure
4. Deletes manifest from Cosmos + D1
5. Sets `avatarUrl = null` on user document
6. Returns `204 No Content`

### Blog Image Upload (`POST /manage/blog/upload-image`)

1. Client sends cropped image + client-generated variants
2. Backend resolves `slug` from request (required `slug` form field — frontend must pass this alongside the image)
3. If replacing (old URL passed in request), extracts old blob path
4. Uploads to `blog-images/{slug}/{guid}.webp` + generates/uploads variants
5. Deletes old blob + variants from Azure (if replacing)
6. Upserts manifest with `container: "blog-images"`, syncs D1, warms R2
7. Returns `{ url: "blog-images/{slug}/{guid}.webp" }`

### Page Image Upload (`POST /user/page-image`)

Same variant pipeline — `page-images/{userId}/{guid}.webp` with `container: "page-images"`. Page images are embedded in rich text content (TipTap editor), so there is no explicit "replace" action — the user deletes an image node and inserts a new one. Orphan cleanup for page images happens when the page is saved: compare image URLs in the saved content against previously stored URLs, delete any that are no longer referenced.

---

## Edge Image Handler Changes

The `/img/*` handler becomes container-aware.

### Request Routing

```
/img/avatars/{userId}/{guid}.webp?w=96&f=auto
/img/blog-images/{slug}/{guid}.webp?w=800&f=auto
/img/page-images/{userId}/{guid}.webp?w=1200&f=auto
```

First path segment after `/img/` determines the container.

### Processing

1. Parse container from path: `avatars` | `blog-images` | `page-images`
2. Validate requested width against allowed widths per container (snap to nearest available width):
   - `avatars`: [48, 96, 192]
   - `blog-images` / `page-images`: [400, 800, 1200, 1600, 2000]
3. D1 lookup by path (path includes container prefix)
4. R2 key: `{path}/w{width}-v{timestamp}.webp`
5. Azure fallback: `{origin}/{path}/w{width}.webp`

### Deleted Image Handling

When D1 manifest is gone (image was deleted), return 404 instead of falling back to Azure. Orphaned R2 objects are not actively cleaned — they simply stop being served.

---

## Migration

One-time Azure Function endpoint: `POST /manage/images/migrate`

Supports dry-run mode, batch processing, and is idempotent (safe to re-run).

### Step 1 — Build Mapping

- Query all blog posts from Cosmos: extract `coverImage`, `bannerImage`, inline image URLs from `content`
- Query all users: extract `avatarUrl`
- Query all page content: extract embedded image URLs
- For each URL, determine target container + new path:
  - Avatar URLs → `avatars/{userId}/{guid}.webp`
  - Blog images → `blog-images/{slug}/{guid}.webp` (look up slug from the referencing post)
  - Page images → `page-images/{userId}/{guid}.webp`

### Step 2 — Copy Blobs

- Server-side copy from old path to new path within Azure (fast, no download/re-upload)
- For avatars lacking variants: generate them during migration
- Upsert new manifests in Cosmos with `container` field

### Step 3 — Update DB References

- Update Cosmos user docs: `avatarUrl` → new relative path
- Update Cosmos blog posts: `coverImage`, `bannerImage`, inline `src` in `content` → new relative paths
- Update Cosmos page content: image URLs → new relative paths
- Change feed propagates all updates to D1 automatically

### Step 4 — Sync & Verify

- Force-sync all manifests to D1
- Verify a sample of `/img/` URLs resolve correctly through new paths

### Step 5 — Cleanup

- Delete old blobs from `blog-images` that were migrated to `avatars` or `page-images`
- Delete old-path manifests from Cosmos

---

## What Doesn't Change

- Client-side crop/WebP conversion (Web Worker)
- R2 queue consumer (just sees different key prefixes)
- Change feed sync pipeline (propagates new fields automatically)
- `ImageCropUpload` component interface

## Out of Scope

- Periodic R2 orphan cleanup (future, low priority)
- Case study images (being reworked later)
