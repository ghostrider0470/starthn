/**
 * Image optimization utility.
 * Generates URLs that go through the CF edge image proxy with auto-resizing.
 *
 * Source images live in Azure Blob → /img/ proxy caches + resizes via CF Image Resizing.
 */

const AZURE_BLOB = 'https://htstorageprod.blob.core.windows.net/'

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
 * Convert an image URL to an optimized edge-cached URL.
 * Returns /img/ proxy URL in both SSR and client contexts.
 */
export function img(src: string | null | undefined, opts?: ImageOpts): string {
  if (!src) return ''

  // Already an /img/ proxy URL
  if (src.startsWith('/img/')) return src

  let path: string

  if (src.startsWith(AZURE_BLOB)) {
    // Legacy full Azure URL — strip origin
    path = src.slice(AZURE_BLOB.length)
  } else if (CONTAINER_PREFIXES.some(p => src.startsWith(p))) {
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
export function imgSrcSet(src: string | null | undefined, widths: readonly number[]): string {
  if (!src) return ''
  return widths
    .map(w => `${img(src, { width: w, format: 'auto' })} ${w}w`)
    .join(', ')
}
