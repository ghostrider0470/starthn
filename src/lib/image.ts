/**
 * Image optimization utility.
 * Generates URLs that go through the CF edge image proxy with auto-resizing.
 *
 * Source images live in Azure Blob → /img/ proxy caches + resizes via CF Image Resizing.
 */
import { env } from '@/env'

const AZURE_BLOB =
  (env.VITE_AZURE_BLOB_ORIGIN ??
    'https://starthnstorage.blob.core.windows.net') + '/'

/** Known image container prefixes */
const CONTAINER_PREFIXES = ['avatars/', 'blog-images/', 'page-images/']

interface ImageOpts {
  width?: number
  quality?: number
  format?: 'webp' | 'avif' | 'auto'
}

/** Standard responsive widths per image type */
export const IMAGE_WIDTHS = {
  cover: [400, 800, 1200, 1600, 2000],
  banner: [400, 800, 1200, 1600, 2000],
  avatar: [48, 96, 192],
  content: [400, 800, 1200, 1600, 2000],
} as const

/**
 * `sizes` for the blog post hero (BlogPostPreview). It spans the post column:
 * the page container (max-w-6xl; 1rem side padding, 1.5rem from 640px, 2rem
 * from 1024px) capped at max-w-5xl (1024px) from 1088px. "100vw" made
 * desktops fetch the 1600w file for a 1024px-wide image.
 */
export const BLOG_HERO_IMAGE_SIZES = [
  '(min-width: 1088px) 1024px',
  '(min-width: 1024px) calc(100vw - 4rem)',
  '(min-width: 640px) calc(100vw - 3rem)',
  'calc(100vw - 2rem)',
].join(', ')

/**
 * `sizes` for the homepage "Why Start HN" photo (WhyStartHNSection). From
 * 1024px it fills 5 of 12 grid columns (gap 2.5rem) of the max-w-7xl
 * container: 5/12 of (100vw - 4rem) minus the gaps, 484px from 1280px.
 * Below that its width follows its height through aspect-[4/5]: 80% of
 * min(52svh, 500px), and at least 80% of its 360px min-height (288px). A
 * 412x823 phone shows it 342px wide, so it gets the 600w file instead of the
 * 900w one that "100vw" picked.
 */
export const WHY_START_HN_IMAGE_SIZES = [
  '(min-width: 1280px) 484px',
  '(min-width: 1024px) calc(41.67vw - 50px)',
  '(max-height: 692px) 288px',
  '(max-height: 961px) 41.6vh',
  '400px',
].join(', ')

/**
 * Convert an image URL to an optimized edge-cached URL.
 * Returns /img/ proxy URL in both SSR and client contexts.
 */
export function img(src: string | null | undefined, opts?: ImageOpts): string {
  if (!src) return ''

  // Already an /img/ proxy URL — merge the requested w/q/f into its query so
  // srcSet widths actually differ (an existing ?w= is replaced, not duplicated).
  if (src.startsWith('/img/')) {
    const u = new URL(src, 'http://x')
    if (opts?.width) u.searchParams.set('w', String(opts.width))
    if (opts?.quality) u.searchParams.set('q', String(opts.quality))
    if (opts?.format) u.searchParams.set('f', opts.format)
    return u.pathname + u.search
  }

  let path: string

  if (src.startsWith(AZURE_BLOB)) {
    // Legacy full Azure URL — strip origin
    path = src.slice(AZURE_BLOB.length)
  } else if (CONTAINER_PREFIXES.some((p) => src.startsWith(p))) {
    // New relative path (e.g., "avatars/userId/guid.webp")
    path = src
  } else {
    // Unknown format — return as-is
    return src
  }

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
export function imgSrcSet(
  src: string | null | undefined,
  widths: ReadonlyArray<number>,
): string {
  if (!src) return ''
  return widths
    .map((w) => `${img(src, { width: w, format: 'auto' })} ${w}w`)
    .join(', ')
}
