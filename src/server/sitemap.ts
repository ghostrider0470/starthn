import { drizzle } from 'drizzle-orm/d1'
import { eq, desc } from 'drizzle-orm'
import { blogPosts } from './db/schema'

const BASE = 'https://www.starthn.ba'

const SEO_LOCALES = [
  'en-US', 'bs-BA', 'hr-HR', 'sr-Latn', 'de-DE', 'fr-FR', 'es-ES',
  'it-IT', 'tr-TR', 'ar-SA', 'pt-BR', 'nl-NL', 'ru-RU', 'ja-JP',
  'zh-Hans', 'ko-KR',
] as const

// hreflang codes for each locale
const HREFLANG: Record<string, string> = {
  'en-US': 'en', 'bs-BA': 'bs', 'hr-HR': 'hr', 'sr-Latn': 'sr-Latn',
  'de-DE': 'de', 'fr-FR': 'fr', 'es-ES': 'es', 'it-IT': 'it',
  'tr-TR': 'tr', 'ar-SA': 'ar', 'pt-BR': 'pt', 'nl-NL': 'nl',
  'ru-RU': 'ru', 'ja-JP': 'ja', 'zh-Hans': 'zh-Hans', 'ko-KR': 'ko',
}

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
  '/team',
  '/careers',
  '/certificates',
  '/blog',
  '/contact',
  '/case-studies',
]

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function alternates(path: string): string {
  const links = SEO_LOCALES.map(
    (loc) => `    <xhtml:link rel="alternate" hreflang="${HREFLANG[loc]}" href="${BASE}/${loc}${path}"/>`,
  )
  links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}/en-US${path}"/>`)
  return links.join('\n')
}

function urlEntry(path: string, lastmod: string): string {
  return `  <url>\n    <loc>${BASE}${path}</loc>\n    <lastmod>${lastmod}</lastmod>\n${alternates(path)}\n  </url>`
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
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
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
