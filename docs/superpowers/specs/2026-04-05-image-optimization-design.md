# Image Optimization & Cache Lifetimes for Maximum Lighthouse Scores

**Date:** 2026-04-05
**Scope:** Frontend image fixes + cache headers. Cache warming deferred to a follow-up task.

## Problem

The site has a working CF Image Resizing proxy (`/img/*`) and image helpers (`img()`, `imgSrcSet()`), but they're not wired up. Result:

- SSR sends raw Azure Blob URLs (unoptimized, no edge cache)
- Zero `<img>` tags use `srcset`/`sizes` (full-res downloaded on mobile)
- 13 `<img>` tags missing `width`/`height` (CLS penalties)
- `imgSrcSet()` hardcodes `f=webp` instead of `f=auto` (misses AVIF)
- No `<link rel="preload">` for above-fold images
- D1 API responses and SSR HTML missing `Cache-Control` headers (~566 KiB wasted on repeat visits)

## Changes

### 1. Fix SSR image URLs (`src/lib/image.ts`)

**Current:** `img()` returns raw Azure Blob URL during SSR (`typeof window === 'undefined'`).

**Fix:** Return `/img/` proxy URL in both SSR and client. The Worker serves its own `/img/*` route, so relative URLs work. This ensures the initial HTML references optimized, edge-cached images.

### 2. Fix format negotiation (`src/lib/image.ts`)

**Current:** `imgSrcSet()` hardcodes `format: 'webp'`.

**Fix:** Change to `format: 'auto'`. CF reads the browser's `Accept` header and serves AVIF (93% support, ~50% smaller than JPEG) when possible, WebP fallback, JPEG safety net.

### 3. Wire `srcset`/`sizes` into image components

Standard widths per image type:

| Type | Widths |
|------|--------|
| Blog covers (16:9) | 400, 800, 1200, 1600 |
| Blog banners (21:9) | 800, 1200, 1600, 2000 |
| Avatars | 48, 96, 192 |
| Page content images | 400, 800, 1200, 1600 |

Components to update:

| Component | File | What to add |
|-----------|------|-------------|
| Blog post card cover | `src/components/blog/BlogPostCard.tsx` | `srcSet` with cover widths, `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"` |
| Blog index featured image | `src/routes/{-$locale}/blog.index.tsx` | `srcSet` with cover widths, `sizes="(max-width: 768px) 100vw, 50vw"` |
| Blog post detail banner | `src/components/blog/BlogPostPreview.tsx` | `srcSet` with banner widths, `sizes="100vw"` |
| Blog post card avatar | `src/components/blog/BlogPostCard.tsx` | Use `img()` with `width: 48` (too small for srcset) |

### 4. Add missing `width`/`height` attributes

| File | Line(s) | Element | Dimensions |
|------|---------|---------|------------|
| `src/components/Navbar.tsx` | 250, 517 | Logo | 40x40 (matches h-10) |
| `src/components/MobileHeader.tsx` | 24 | Logo | 32x32 (matches h-8) |
| `src/components/Footer.tsx` | 88 | Logo | 56x56 (matches h-14) |
| `src/components/login-form.tsx` | 139 | Logo | 48x48 |
| `src/components/register-form.tsx` | 115 | Logo | 48x48 |
| `src/components/FirstTimeSetup.tsx` | 24 | Logo | 48x48 |
| `src/components/admin/AdminNavbar.tsx` | 112 | Logo | 32x32 |
| `src/components/admin/AdminSidebar.tsx` | 221 | Avatar | 32x32 |
| `src/routes/{-$locale}/admin/users.tsx` | 50 | Avatar | 40x40 |
| `src/components/ui/azure-icon.tsx` | 10-17 | Icon | 24x24 |
| `src/components/common/ImageNodeView.tsx` | 165 | Content img | Use natural dimensions from node attrs |
| `src/components/TwoFactorSetup.tsx` | 210 | QR code | 192x192 (matches w-48) |
| `src/routes/{-$locale}/register.tsx` | 23 | Placeholder | 1920x1080 |

### 5. Add preload hint for navbar logo (`src/routes/__root.tsx`)

Add to the `links` array:
```
{ rel: 'preload', as: 'image', href: '/clean-square.webp', type: 'image/webp' }
```

This is above-fold on every page and currently has no preload hint.

### 6. Add Cache-Control headers for efficient cache lifetimes

Lighthouse flags ~566 KiB of savings from missing cache headers. Three gaps:

**6a. D1 API responses** (`src/server/db/api-routes.ts`)
Public read endpoints return JSON with no `Cache-Control`. Add headers:

| Route pattern | Cache-Control | Rationale |
|---|---|---|
| `GET /api/blog`, `/api/blog/:slug` | `public, max-age=300, s-maxage=3600` | Content changes infrequently; 5min browser, 1hr edge |
| `GET /api/blog/categories`, `/api/blog/tags` | `public, max-age=3600, s-maxage=86400` | Rarely changes; 1hr browser, 1day edge |
| `GET /api/case-studies`, `/api/case-studies/:slug` | `public, max-age=300, s-maxage=3600` | Same as blog |
| `GET /api/authors`, `/api/authors/:slug` | `public, max-age=3600, s-maxage=86400` | Rarely changes |

**6b. SSR HTML responses** (`src/server.ts`)
The SSR fallback handler returns HTML with no cache header. Add:
- `Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=300`
- Edge caches for 60s, serves stale for 5min while revalidating. Browser always revalidates (fresh content on hard refresh).

**6c. Static assets already handled**
- `/img/*` proxy: already `public, max-age=31536000, immutable` (good)
- Vite build assets: content-hashed filenames, but the Worker needs to set `Cache-Control: public, max-age=31536000, immutable` on `/_build/assets/*` responses if not already done.

## Expected Lighthouse Impact

| Metric | Current Issue | Fix | Score Impact |
|--------|--------------|-----|-------------|
| LCP | SSR sends unoptimized Azure Blob URLs | Fix `img()` for SSR + srcset | High (25% of score) |
| CLS | 13 images missing dimensions | Add width/height | High (25% of score) |
| LCP | No preload for above-fold logo | Add preload hint | Medium |
| Bandwidth | Full-res images on mobile | srcset/sizes | Medium (indirect LCP) |
| LCP | WebP only, missing AVIF | f=auto | Low-Medium |
| Cache | API + HTML responses missing Cache-Control | Add headers | Medium (566 KiB on repeat visits) |

## Out of Scope (Deferred)

- Cache warming Azure Function / Worker-side `warmImageCache()`
- One-time backfill script for existing images
- `<picture>` element (unnecessary — CF `f=auto` handles format negotiation)
- Pre-generating image variants in Azure Blob Storage
