# Image Optimization & Cache Lifetimes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maximize Lighthouse scores by fixing image delivery (SSR URLs, srcset, dimensions, preload) and adding cache headers to API/SSR responses.

**Architecture:** Fix `src/lib/image.ts` to produce optimized `/img/` proxy URLs in both SSR and client contexts. Wire `imgSrcSet()` into all blog image components. Add `width`/`height` to every `<img>` tag. Add `Cache-Control` headers to D1 API responses and SSR HTML. All changes are frontend/Worker-side — no Azure Functions changes.

**Tech Stack:** TanStack Start, Hono (Cloudflare Workers), CF Image Resizing, TypeScript

---

### Task 1: Fix `img()` for SSR and `imgSrcSet()` format

**Files:**
- Modify: `src/lib/image.ts`

- [ ] **Step 1: Fix `img()` to return proxy URLs during SSR**

In `src/lib/image.ts`, replace the entire file with:

```typescript
/**
 * Image optimization utility.
 * Generates URLs that go through the CF edge image proxy with auto-resizing.
 *
 * Source images live in Azure Blob → /img/ proxy caches + resizes via CF Image Resizing.
 */

const AZURE_BLOB = 'https://htstorageprod.blob.core.windows.net/'

interface ImageOpts {
  width?: number
  quality?: number
  format?: 'webp' | 'avif' | 'auto'
}

/** Standard responsive widths per image type */
export const IMAGE_WIDTHS = {
  cover: [400, 800, 1200, 1600],
  banner: [800, 1200, 1600, 2000],
  avatar: [48, 96, 192],
  content: [400, 800, 1200, 1600],
} as const

/**
 * Convert an image URL to an optimized edge-cached URL.
 * Returns /img/ proxy URL in both SSR and client contexts.
 */
export function img(src: string | null | undefined, opts?: ImageOpts): string {
  if (!src) return ''

  // If it's already a relative /img/ URL or not an Azure blob URL, return as-is
  if (!src.startsWith(AZURE_BLOB)) return src

  // Rewrite to edge proxy
  const path = src.slice(AZURE_BLOB.length)
  const params = new URLSearchParams()
  if (opts?.width) params.set('w', String(opts.width))
  if (opts?.quality) params.set('q', String(opts.quality))
  if (opts?.format) params.set('f', opts.format)

  const qs = params.toString()
  return `/img/${path}${qs ? `?${qs}` : ''}`
}

/**
 * Generate srcSet for responsive images.
 * Returns srcSet string with multiple widths using auto format negotiation.
 */
export function imgSrcSet(src: string | null | undefined, widths: number[]): string {
  if (!src) return ''
  return widths
    .map(w => `${img(src, { width: w, format: 'auto' })} ${w}w`)
    .join(', ')
}
```

Key changes:
- Removed the `if (typeof window === 'undefined') return src` guard — proxy URLs are now returned during SSR too
- `imgSrcSet()` uses `format: 'auto'` instead of `'webp'`
- Added `IMAGE_WIDTHS` constant for standard breakpoints

- [ ] **Step 2: Verify the build still compiles**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds (no type errors from the changed exports)

- [ ] **Step 3: Commit**

```bash
git add src/lib/image.ts
git commit -m "$(cat <<'EOF'
fix: return /img/ proxy URLs during SSR and use format=auto

SSR was returning raw Azure Blob URLs, causing unoptimized images on
first paint. Now returns /img/ proxy URLs in both SSR and client.
imgSrcSet() changed from hardcoded webp to auto (CF serves AVIF/WebP).
EOF
)"
```

---

### Task 2: Wire `srcset`/`sizes` into blog image components

**Files:**
- Modify: `src/components/blog/BlogPostCard.tsx`
- Modify: `src/components/blog/BlogPostPreview.tsx`
- Modify: `src/routes/{-$locale}/blog.index.tsx`

- [ ] **Step 1: Update BlogPostCard cover image**

In `src/components/blog/BlogPostCard.tsx`, add the import at the top (after the existing imports):

```typescript
import { img, imgSrcSet, IMAGE_WIDTHS } from '@/lib/image'
```

Then replace the cover image `<img>` tag (lines 58-65):

```tsx
            <img
              src={img(post.coverImage, { width: 800, format: 'auto' })}
              srcSet={imgSrcSet(post.coverImage, IMAGE_WIDTHS.cover)}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              alt={post.title}
              width={680}
              height={383}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
```

And replace the avatar image (lines 131-137):

```tsx
                <img
                  src={img(post.authorAvatarUrl, { width: 48, format: 'auto' })}
                  alt={post.author}
                  width={24}
                  height={24}
                  loading="lazy"
                  className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-border/50"
                />
```

- [ ] **Step 2: Update BlogPostPreview banner image**

In `src/components/blog/BlogPostPreview.tsx`, add the import:

```typescript
import { img, imgSrcSet, IMAGE_WIDTHS } from '@/lib/image'
```

Replace the banner `<img>` tag (lines 77-85):

```tsx
          <img
            src={img(bannerImage || coverImage, { width: 1600, format: 'auto' })}
            srcSet={imgSrcSet(bannerImage || coverImage, IMAGE_WIDTHS.banner)}
            sizes="100vw"
            alt={title}
            width={1200}
            height={400}
            fetchPriority="high"
            decoding="async"
            className="w-full object-cover max-h-96"
          />
```

Also update the avatar — replace `<AvatarImage>` (line 125-127):

```tsx
              {authorAvatarUrl && (
                <AvatarImage src={img(authorAvatarUrl, { width: 96, format: 'auto' })} alt={author} width={40} height={40} />
              )}
```

- [ ] **Step 3: Update blog index featured image**

In `src/routes/{-$locale}/blog.index.tsx`, add the import:

```typescript
import { img, imgSrcSet, IMAGE_WIDTHS } from '@/lib/image'
```

Replace the featured post `<img>` tag (lines 527-535):

```tsx
                      <img
                        src={img(featuredPost.coverImage, { width: 800, format: 'auto' })}
                        srcSet={imgSrcSet(featuredPost.coverImage, IMAGE_WIDTHS.cover)}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        alt={featuredPost.title}
                        width={800}
                        height={450}
                        fetchPriority="high"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
```

- [ ] **Step 4: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/components/blog/BlogPostCard.tsx src/components/blog/BlogPostPreview.tsx src/routes/{-\$locale}/blog.index.tsx
git commit -m "$(cat <<'EOF'
feat: add srcset/sizes to all blog images for responsive delivery

Blog covers use [400,800,1200,1600] widths, banners [800,1200,1600,2000].
Avatars use img() with width 48/96. All use format=auto for AVIF/WebP.
EOF
)"
```

---

### Task 3: Add `width`/`height` to all images missing dimensions

**Files:**
- Modify: `src/components/Navbar.tsx` (lines 249-254, 516-521)
- Modify: `src/components/MobileHeader.tsx` (lines 23-27)
- Modify: `src/components/Footer.tsx` (lines 87-93)
- Modify: `src/components/login-form.tsx` (lines 138-142)
- Modify: `src/components/register-form.tsx` (lines 114-118)
- Modify: `src/components/FirstTimeSetup.tsx` (lines 23-27)
- Modify: `src/components/admin/AdminNavbar.tsx` (lines 111-116)
- Modify: `src/components/admin/AdminSidebar.tsx` (lines 221-225)
- Modify: `src/routes/{-$locale}/admin/users.tsx` (lines 50-54)
- Modify: `src/components/ui/azure-icon.tsx` (lines 10-17)
- Modify: `src/components/common/ImageNodeView.tsx` (lines 165-171)
- Modify: `src/components/TwoFactorSetup.tsx` (lines 210-214)
- Modify: `src/routes/{-$locale}/register.tsx` (lines 22-26)

- [ ] **Step 1: Navbar desktop logo**

In `src/components/Navbar.tsx`, replace the logo `<img>` at line 249-254:

```tsx
              <img
                src="/clean-square.webp"
                alt={companyName}
                width={44}
                height={44}
                className="h-8 w-8 object-contain sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-11 lg:w-11"
                decoding="async"
              />
```

- [ ] **Step 2: Navbar mobile menu logo**

In `src/components/Navbar.tsx`, replace the mobile logo `<img>` at line 516-521:

```tsx
                        <img
                          src="/clean-square.webp"
                          alt={companyName}
                          width={32}
                          height={32}
                          className="h-8 w-8 object-contain"
                          decoding="async"
                        />
```

- [ ] **Step 3: MobileHeader logo**

In `src/components/MobileHeader.tsx`, replace the logo `<img>` at lines 23-27:

```tsx
          <img
            src="/clean-square.webp"
            alt="Horizon Tech"
            width={40}
            height={40}
            className="h-10 w-auto"
          />
```

- [ ] **Step 4: Footer logo**

In `src/components/Footer.tsx`, replace the logo `<img>` at lines 87-93:

```tsx
              <img
                src="/clean-square.webp"
                alt="Horizon Tech"
                width={56}
                height={56}
                className="h-14 w-auto"
                loading="lazy"
                decoding="async"
              />
```

- [ ] **Step 5: Login form logo**

In `src/components/login-form.tsx`, replace the logo `<img>` at lines 138-142:

```tsx
            <img
              src="/clean-square.webp"
              alt="Horizon Tech"
              width={64}
              height={64}
              className="h-16 w-auto mb-4"
            />
```

- [ ] **Step 6: Register form logo**

In `src/components/register-form.tsx`, replace the logo `<img>` at lines 114-118:

```tsx
            <img
              src="/clean-square.webp"
              alt="Horizon Tech"
              width={64}
              height={64}
              className="h-16 w-auto mb-4"
            />
```

- [ ] **Step 7: FirstTimeSetup logo**

In `src/components/FirstTimeSetup.tsx`, replace the logo `<img>` at lines 23-27:

```tsx
        <img
          src="/clean-square.webp"
          alt="Horizon Tech"
          width={64}
          height={64}
          className="h-16 w-auto mx-auto mb-6"
        />
```

- [ ] **Step 8: AdminNavbar logo**

In `src/components/admin/AdminNavbar.tsx`, replace the logo `<img>` at lines 111-116:

```tsx
              <img
                src="/clean-square.webp"
                alt="Horizon Tech"
                width={48}
                height={48}
                className="h-14 w-auto py-1"
                decoding="async"
              />
```

- [ ] **Step 9: AdminSidebar avatar**

In `src/components/admin/AdminSidebar.tsx`, replace the avatar `<img>` at lines 221-225:

```tsx
          <img
            src={user.avatarUrl}
            alt={fullName}
            width={28}
            height={28}
            className="size-7 shrink-0 rounded-full object-cover"
          />
```

- [ ] **Step 10: Admin users avatar**

In `src/routes/{-$locale}/admin/users.tsx`, replace the avatar `<img>` at lines 50-54. This component has two sizes (`lg`: 48px, default: 32px), so use the larger value as intrinsic dimension:

```tsx
      <img
        src={user.avatarUrl}
        alt={`${user.firstName} ${user.lastName}`}
        width={48}
        height={48}
        className={cn('rounded-full object-cover shrink-0', dim)}
      />
```

- [ ] **Step 11: AzureIcon**

In `src/components/ui/azure-icon.tsx`, replace the `<img>` at lines 10-17:

```tsx
    <img
      src={iconPath}
      alt=""
      width={24}
      height={24}
      className={cn('w-full h-full object-contain', className)}
      aria-hidden="true"
      loading="lazy"
      decoding="async"
    />
```

- [ ] **Step 12: ImageNodeView**

In `src/components/common/ImageNodeView.tsx`, replace the `<img>` at lines 165-171. The editor stores width in node attrs, so read it:

```tsx
        <img
          src={src}
          alt={alt || ''}
          title={title || undefined}
          width={node.attrs.width || undefined}
          height={node.attrs.height || undefined}
          className="rounded-lg h-auto w-full block"
          draggable={false}
        />
```

- [ ] **Step 13: TwoFactorSetup QR code**

In `src/components/TwoFactorSetup.tsx`, replace the `<img>` at lines 210-214:

```tsx
                      <img 
                        src={setupData.qrCodeBase64} 
                        alt="2FA QR Code" 
                        width={192}
                        height={192}
                        className="w-48 h-48"
                      />
```

- [ ] **Step 14: Register page placeholder**

In `src/routes/{-$locale}/register.tsx`, replace the `<img>` at lines 22-26:

```tsx
        <img
          src="/placeholder.svg"
          alt="Horizon Tech"
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
```

- [ ] **Step 15: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 16: Commit**

```bash
git add src/components/Navbar.tsx src/components/MobileHeader.tsx src/components/Footer.tsx src/components/login-form.tsx src/components/register-form.tsx src/components/FirstTimeSetup.tsx src/components/admin/AdminNavbar.tsx src/components/admin/AdminSidebar.tsx src/routes/{-\$locale}/admin/users.tsx src/components/ui/azure-icon.tsx src/components/common/ImageNodeView.tsx src/components/TwoFactorSetup.tsx src/routes/{-\$locale}/register.tsx
git commit -m "$(cat <<'EOF'
fix: add explicit width/height to all images missing dimensions

Prevents CLS (Cumulative Layout Shift) by giving the browser intrinsic
dimensions before images load. Covers logos, avatars, icons, QR codes,
editor images, and placeholder across 13 components.
EOF
)"
```

---

### Task 4: Add preload hint for navbar logo

**Files:**
- Modify: `src/routes/__root.tsx`

- [ ] **Step 1: Add preload link**

In `src/routes/__root.tsx`, add the preload hint to the `links` array (after the `dns-prefetch` entry at line 225):

```typescript
      { rel: 'dns-prefetch', href: 'https://challenges.cloudflare.com' },
      { rel: 'preload', as: 'image', href: '/clean-square.webp', type: 'image/webp' },
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/routes/__root.tsx
git commit -m "$(cat <<'EOF'
perf: preload navbar logo for faster above-fold rendering

clean-square.webp is above-fold on every page. Preload hint lets
the browser discover it before parsing CSS/JS.
EOF
)"
```

---

### Task 5: Add Cache-Control headers to D1 API responses

**Files:**
- Modify: `src/server/db/api-routes.ts`

- [ ] **Step 1: Add cache-aware json helper**

In `src/server/db/api-routes.ts`, replace the `json` function (lines 16-21):

```typescript
function json(data: unknown, status = 200, cacheSeconds?: number) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (cacheSeconds) {
    headers['Cache-Control'] = `public, max-age=${Math.floor(cacheSeconds / 6)}, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`
  }
  return new Response(JSON.stringify(data), { status, headers })
}
```

This sets:
- `max-age` = 1/6 of edge TTL (short browser cache)
- `s-maxage` = full TTL (edge cache via CF)
- `stale-while-revalidate` = 2x TTL (serve stale while revalidating)

- [ ] **Step 2: Add cache TTLs to each route response**

In `src/server/db/api-routes.ts`, update every `return json(...)` call:

For blog list (line 49-55 paginated, line 59 plain array):
```typescript
        return json({
          items,
          totalCount: total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        }, 200, 300)
      }

      // No pagination — return plain array (used by useBlogPosts hook)
      return json(await repo.getPublished(locale, 1, 100), 200, 300)
```

For blog by slug (line 73):
```typescript
        return json(post, 200, 3600)
```

For categories (line 80):
```typescript
      return json(await repo.getAll(locale), 200, 86400)
```

For tags (line 85):
```typescript
      return json(await repo.getAll(locale), 200, 86400)
```

For case studies list (line 92):
```typescript
      return json(await repo.getPublished(locale), 200, 300)
```

For case study by slug (line 100):
```typescript
      return json(study, 200, 3600)
```

For authors list (line 107):
```typescript
      return json(await repo.getAuthors(), 200, 86400)
```

For author by slug (line 115):
```typescript
      return json(author, 200, 86400)
```

404 responses stay uncached (no third argument).

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/server/db/api-routes.ts
git commit -m "$(cat <<'EOF'
perf: add Cache-Control headers to D1 public API responses

Blog lists: 5min edge, blog posts: 1hr, categories/tags/authors: 1day.
Uses s-maxage for edge + stale-while-revalidate for smooth transitions.
EOF
)"
```

---

### Task 6: Add Cache-Control to SSR HTML responses

**Files:**
- Modify: `src/server.ts`

- [ ] **Step 1: Add cache header to SSR handler**

In `src/server.ts`, replace the SSR fallback handler (lines 182-190):

```typescript
// ─── SSR fallback (TanStack Start) ─────────────────────────
app.all('*', async (c) => {
  // Make D1 available to route loaders during SSR
  setD1(c.env?.DB)
  try {
    const response = await handler.fetch(c.req.raw)

    // Cache HTML at edge briefly, serve stale while revalidating
    if (response.headers.get('Content-Type')?.includes('text/html')) {
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')
      return new Response(response.body, { status: response.status, headers })
    }

    return response
  } finally {
    clearD1()
  }
})
```

This caches HTML at the edge for 60s and serves stale for 5min while revalidating. Browsers always revalidate (`max-age=0`), ensuring fresh content on hard refresh.

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/server.ts
git commit -m "$(cat <<'EOF'
perf: add Cache-Control to SSR HTML responses

Edge caches HTML for 60s with 5min stale-while-revalidate.
Browser always revalidates (max-age=0) for fresh content.
EOF
)"
```
