import { drizzle } from 'drizzle-orm/d1'
import { and, desc, eq } from 'drizzle-orm'
import { blogPostTranslations, blogPosts } from './db/schema'
import { SEO_PRIORITY_LOCALES, isIndexableLocaleForPage } from '@/lib/seo'

const BASE = 'https://www.starthn.ba'

/**
 * Locales that get a child sitemap: exactly the indexable ones from @/lib/seo
 * (imported, not re-declared, so the two lists cannot drift). Every other
 * /sitemap-<code>.xml answers 410 Gone, including locales that visitors can
 * still open but that are noindex (sr-Latn, de-DE, …).
 */
export const SITEMAP_LOCALES: ReadonlyArray<string> = SEO_PRIORITY_LOCALES

/** Static paths (no locale prefix — prepended per locale below). */
export const STATIC_PATHS: ReadonlyArray<string> = [
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
  // '/team' — disabled (the route returns 404); re-add when it goes live.
  '/careers',
  '/certificates',
  '/blog',
  '/contact',
  '/privacy',
  '/terms',
]

/**
 * The date (YYYY-MM-DD) of the last deploy that changed the copy of the static
 * pages (STATIC_PATHS): their locale JSON, page components or structured
 * data. It is a real content date, used as the static URLs' <lastmod> and as
 * the floor of every child sitemap's date in the index. Bump it by hand in the
 * PR that changes page content; never set it from the clock (a lastmod that is
 * always "today" teaches Google to ignore the field for the whole site).
 */
export const STATIC_CONTENT_LASTMOD = '2026-09-25'

/** A blog_posts row LEFT JOINed with its translation row for one locale. */
export interface SitemapPostRow {
  slug: string
  lang: string | null
  publishedAt: string | null
  updatedAt: string | null
  /** blog_post_translations.id — null when the post has no row for the locale. */
  translationId: string | null
  translatedAt: string | null
}

export interface SitemapPost {
  slug: string
  /** YYYY-MM-DD, or undefined when no usable date exists. */
  lastmod: string | undefined
}

const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/

/**
 * The latest of the given timestamps as YYYY-MM-DD. D1 mixes ISO strings and
 * SQLite datetime('now') strings, so values are compared by their date part.
 */
export function latestDate(
  ...values: Array<string | null | undefined>
): string | undefined {
  let latest: string | undefined
  for (const value of values) {
    if (!value || !DATE_PREFIX.test(value)) continue
    const day = value.slice(0, 10)
    if (latest === undefined || day > latest) latest = day
  }
  return latest
}

/**
 * Posts that really exist in `locale`: written in it, or translated into it.
 * Listing an untranslated post would advertise a URL that has no content.
 */
export function selectLocalePosts(
  rows: ReadonlyArray<SitemapPostRow>,
  locale: string,
): Array<SitemapPost> {
  return rows
    .filter((row) => row.lang === locale || row.translationId !== null)
    .map((row) => ({
      slug: row.slug,
      lastmod: latestDate(row.publishedAt, row.updatedAt, row.translatedAt),
    }))
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Per-page hreflang alternates are emitted as <link rel="alternate"> tags in
// each page's <head> (see src/lib/seo.ts). We intentionally do NOT duplicate
// them as <xhtml:link> here: the xhtml namespace makes Chrome/Edge skip their
// native XML tree viewer, rendering the sitemap as an unreadable text blob.
//
// <lastmod> is only written when it is a real content date. A lastmod that is
// always "today" teaches Google to ignore the field for the whole site.
function lastmodTag(lastmod: string | undefined): string {
  return lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
}

export function urlEntry(localizedPath: string, lastmod?: string): string {
  return `  <url>\n    <loc>${BASE}${escapeXml(localizedPath)}</loc>${lastmodTag(lastmod)}\n  </url>`
}

/**
 * The newest <lastmod> in a locale sitemap built from `posts`: the static
 * pages' content date or the newest post date, whichever is later.
 */
export function localeSitemapLastmod(
  posts: ReadonlyArray<SitemapPost>,
  staticLastmod: string = STATIC_CONTENT_LASTMOD,
): string | undefined {
  return latestDate(staticLastmod, ...posts.map((post) => post.lastmod))
}

export function localeSitemap(
  locale: string,
  posts: ReadonlyArray<SitemapPost>,
  staticLastmod: string = STATIC_CONTENT_LASTMOD,
): string {
  const newestPost = latestDate(...posts.map((post) => post.lastmod))
  // A page without its own text in this locale (e.g. /hr-HR/privacy) is
  // noindex, so it is left out (see PAGE_CONTENT_LOCALES in @/lib/seo).
  // Static pages carry the static content date; /blog lists the posts, so it
  // also moves with the newest one.
  const staticEntries = STATIC_PATHS.filter((path) =>
    isIndexableLocaleForPage(path || '/', locale),
  ).map((path) =>
    urlEntry(
      `/${locale}${path}`,
      path === '/blog' ? latestDate(staticLastmod, newestPost) : staticLastmod,
    ),
  )
  const blogEntries = posts.map(({ slug, lastmod }) =>
    urlEntry(`/${locale}/blog/${slug}`, lastmod),
  )
  const entries = [...staticEntries, ...blogEntries].join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`
}

/**
 * The sitemap index. `lastmods` maps a locale to the newest <lastmod> of its
 * child sitemap (localeSitemapLastmod); a locale without one gets no
 * <lastmod>, rather than an invented date.
 */
export function sitemapIndex(
  lastmods: Readonly<Record<string, string | undefined>> = {},
): string {
  const entries = SITEMAP_LOCALES.map(
    (loc) =>
      `  <sitemap>\n    <loc>${BASE}/sitemap-${loc}.xml</loc>${lastmodTag(lastmods[loc])}\n  </sitemap>`,
  ).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`
}

async function getPublishedSlugs(db: D1Database, locale: string): Promise<Array<SitemapPost>> {
  const orm = drizzle(db)
  const rows = await orm
    .select({
      slug: blogPosts.slug,
      lang: blogPosts.lang,
      publishedAt: blogPosts.publishedAt,
      updatedAt: blogPosts.updatedAt,
      translationId: blogPostTranslations.id,
      translatedAt: blogPostTranslations.translatedAt,
    })
    .from(blogPosts)
    .leftJoin(
      blogPostTranslations,
      and(
        eq(blogPostTranslations.postId, blogPosts.id),
        eq(blogPostTranslations.locale, locale),
      ),
    )
    .where(eq(blogPosts.isPublished, 1))
    .orderBy(desc(blogPosts.publishedAt))
  return selectLocalePosts(rows, locale)
}

const XML_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
}

/** 410 for child sitemaps of locales that are not indexable (or not locales). */
export function goneSitemapResponse(): Response {
  return new Response('410 Gone', {
    status: 410,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

/**
 * Newest <lastmod> of every child sitemap. Without D1 (or when the read
 * fails) each child still has its static pages, so it gets their date.
 */
async function childSitemapLastmods(
  db: D1Database | undefined,
): Promise<Record<string, string | undefined>> {
  const staticOnly = () =>
    Object.fromEntries(
      SITEMAP_LOCALES.map((locale) => [locale, localeSitemapLastmod([])]),
    )
  if (!db) return staticOnly()
  try {
    const entries = await Promise.all(
      SITEMAP_LOCALES.map(async (locale) => {
        const posts = await getPublishedSlugs(db, locale)
        return [locale, localeSitemapLastmod(posts)] as const
      }),
    )
    return Object.fromEntries(entries)
  } catch (error) {
    console.error('[sitemap] lastmod lookup failed:', error)
    return staticOnly()
  }
}

export async function handleSitemap(request: Request, env: { DB?: D1Database }): Promise<Response | null> {
  const { pathname } = new URL(request.url)

  if (pathname === '/sitemap.xml') {
    const lastmods = await childSitemapLastmods(env.DB)
    return new Response(sitemapIndex(lastmods), { headers: XML_HEADERS })
  }

  const match = pathname.match(/^\/sitemap-([^/]+)\.xml$/)
  if (!match) return null

  const locale = match[1]
  if (!SITEMAP_LOCALES.includes(locale)) return goneSitemapResponse()

  const posts = env.DB ? await getPublishedSlugs(env.DB, locale) : []
  return new Response(localeSitemap(locale, posts), { headers: XML_HEADERS })
}
