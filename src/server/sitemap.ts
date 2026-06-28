import { drizzle } from 'drizzle-orm/d1'
import { eq, desc } from 'drizzle-orm'
import { blogPosts } from './db/schema'
import { SEO_PRIORITY_LOCALES } from '@/lib/seo'

const BASE = 'https://www.starthn.ba'

// Single source of truth for target locales (mirrors @/lib/seo). Imported, not
// re-declared, so adding/removing a locale in seo.ts also updates the sitemap.
const SEO_LOCALES = SEO_PRIORITY_LOCALES

// Static paths (no locale prefix — prepended per locale below)
const STATIC_PATHS = [
  '',
  '/services',
  '/services/bookkeeping-accounting',
  '/services/tax-consulting',
  '/services/virtual-cfo',
  '/services/business-consulting',
  '/services/financial-reporting',
  '/services/education-courses',
  '/about',
  '/mission-vision',
  // '/team' — temporarily disabled (route 307-redirects to home); re-add when live.
  '/careers',
  '/certificates',
  '/blog',
  '/contact',
  '/privacy',
  '/terms',
]

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// Per-page hreflang alternates are emitted as <link rel="alternate"> tags in
// each page's <head> (see src/lib/seo.ts). We intentionally do NOT duplicate
// them as <xhtml:link> here: the xhtml namespace makes Chrome/Edge skip their
// native XML tree viewer, rendering the sitemap as an unreadable text blob.
function urlEntry(localizedPath: string, lastmod: string): string {
  return `  <url>\n    <loc>${BASE}${localizedPath}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
}

function localeSitemap(locale: string, slugs: Array<{ slug: string; lastmod: string }>): string {
  const staticEntries = STATIC_PATHS.map((p) =>
    urlEntry(`/${locale}${p}`, today()),
  )
  const blogEntries = slugs.map(({ slug, lastmod }) =>
    urlEntry(`/${locale}/blog/${slug}`, lastmod),
  )
  const entries = [...staticEntries, ...blogEntries].join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`
}

function sitemapIndex(): string {
  const entries = SEO_LOCALES.map(
    (loc) =>
      `  <sitemap>\n    <loc>${BASE}/sitemap-${loc}.xml</loc>\n    <lastmod>${today()}</lastmod>\n  </sitemap>`,
  ).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`
}

async function getPublishedSlugs(db: D1Database): Promise<Array<{ slug: string; lastmod: string }>> {
  const orm = drizzle(db)
  const rows = await orm
    .select({ slug: blogPosts.slug, publishedAt: blogPosts.publishedAt, updatedAt: blogPosts.updatedAt })
    .from(blogPosts)
    .where(eq(blogPosts.isPublished, 1))
    .orderBy(desc(blogPosts.publishedAt))
  return rows.map((r) => ({
    slug: r.slug,
    lastmod: (r.publishedAt ?? r.updatedAt).slice(0, 10),
  }))
}

const XML_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
}

export async function handleSitemap(request: Request, env: { DB?: D1Database }): Promise<Response | null> {
  const { pathname } = new URL(request.url)

  if (pathname === '/sitemap.xml') {
    return new Response(sitemapIndex(), { headers: XML_HEADERS })
  }

  const match = pathname.match(/^\/sitemap-([^/]+)\.xml$/)
  if (!match) return null

  const locale = match[1] as string
  if (!(SEO_LOCALES as readonly string[]).includes(locale)) return null

  const slugs = env.DB ? await getPublishedSlugs(env.DB) : []
  return new Response(localeSitemap(locale, slugs), { headers: XML_HEADERS })
}
