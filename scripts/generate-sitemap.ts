#!/usr/bin/env tsx
/**
 * Generates a sitemap index + per-locale sub-sitemaps with:
 * - <lastmod> on every entry (the only field Google actually uses)
 * - hreflang alternates for all priority locales + x-default
 * - Dynamic blog posts, case studies, and team member URLs from the API
 *
 * Output:
 *   public/sitemap.xml              (sitemap index)
 *   public/sitemap-{locale}.xml     (per-locale sitemaps)
 *
 * Usage: npx tsx scripts/generate-sitemap.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load .env.production so feature flags match deployed config
const envProd = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.production')
try {
  for (const line of readFileSync(envProd, 'utf-8').split('\n')) {
    const m = line.match(/^(\w+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
} catch { /* no .env.production — use process.env as-is */ }

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = resolve(__dirname, '..', 'public')

// ── Config ──────────────────────────────────────────────────────────────────

const ORIGIN = 'https://www.horizon-tech.io'
const API_URL = process.env.API_URL ?? 'https://www.horizon-tech.io/api'

const SEO_PRIORITY_LOCALES = [
  'en-US', 'bs-BA', 'hr-HR', 'sr-Latn', 'de-DE', 'fr-FR', 'es-ES',
  'it-IT', 'tr-TR', 'ar-SA', 'pt-BR', 'nl-NL', 'ru-RU', 'ja-JP',
  'zh-Hans', 'ko-KR',
] as const

const DEFAULT_LOCALE = 'en-US'

/** BCP 47 locale → hreflang attribute value */
const HREFLANG_MAP: Record<string, string> = {
  'en-US': 'en', 'bs-BA': 'bs', 'hr-HR': 'hr', 'sr-Latn': 'sr-Latn',
  'de-DE': 'de', 'fr-FR': 'fr', 'es-ES': 'es', 'it-IT': 'it',
  'tr-TR': 'tr', 'ar-SA': 'ar', 'pt-BR': 'pt', 'nl-NL': 'nl',
  'ru-RU': 'ru', 'ja-JP': 'ja', 'zh-Hans': 'zh-Hans', 'ko-KR': 'ko',
}

// ── Route Definitions ───────────────────────────────────────────────────────

interface RouteEntry {
  path: string
  lastmod: string
}

/** Today in ISO 8601 (YYYY-MM-DD) — used as fallback for static pages */
const TODAY = new Date().toISOString().slice(0, 10)

// Feature flags — read from .env.production (matches deployed config)
const FEATURE_CASE_STUDIES = process.env.VITE_FEATURE_CASE_STUDIES === 'true'
const FEATURE_TECHNICAL_RESOURCES = process.env.VITE_FEATURE_TECHNICAL_RESOURCES === 'true'

const STATIC_ROUTES: RouteEntry[] = [
  { path: '/', lastmod: TODAY },
  { path: '/about', lastmod: TODAY },
  { path: '/team', lastmod: TODAY },
  { path: '/careers', lastmod: TODAY },
  { path: '/contact', lastmod: TODAY },
  { path: '/blog', lastmod: TODAY },
  { path: '/privacy', lastmod: TODAY },
  { path: '/terms', lastmod: TODAY },
  { path: '/services/enterprise-software-development', lastmod: TODAY },
  { path: '/services/ai-ml-business-intelligence', lastmod: TODAY },
  { path: '/services/cloud-architecture', lastmod: TODAY },
  { path: '/services/iot-edge-computing', lastmod: TODAY },
  { path: '/services/devops-platform-engineering', lastmod: TODAY },
  { path: '/services/digital-transformation', lastmod: TODAY },
  // Feature-flagged routes — only include when enabled
  ...(FEATURE_CASE_STUDIES ? [{ path: '/case-studies', lastmod: TODAY }] : []),
  ...(FEATURE_TECHNICAL_RESOURCES ? [
    { path: '/education', lastmod: TODAY },
    { path: '/support', lastmod: TODAY },
    { path: '/innovation-lab', lastmod: TODAY },
    { path: '/innovation-lab/ai-systems', lastmod: TODAY },
    { path: '/innovation-lab/nlp', lastmod: TODAY },
    { path: '/innovation-lab/genetic-algorithm', lastmod: TODAY },
  ] : []),
]

// ── API Fetchers ────────────────────────────────────────────────────────────

interface BlogPost { slug: string; publishedAt?: string }
interface CaseStudy { slug: string }
interface Author { slug?: string }

async function fetchJson<T>(url: string, label: string): Promise<T[]> {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as T[]
  } catch (err) {
    console.warn(`  WARNING: Could not fetch ${label}: ${err}`)
    return []
  }
}

/** Try to normalise a date string to YYYY-MM-DD, fallback to today */
function toIsoDate(raw?: string): string {
  if (!raw) return TODAY
  const d = new Date(raw)
  return isNaN(d.getTime()) ? TODAY : d.toISOString().slice(0, 10)
}

// ── XML Helpers ─────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function localeUrl(locale: string, path: string): string {
  return path === '/' ? `${ORIGIN}/${locale}` : `${ORIGIN}/${locale}${path}`
}

// ── Per-Locale Sitemap Generation ───────────────────────────────────────────

function buildUrlEntry(route: RouteEntry, locale: string): string {
  const loc = escapeXml(localeUrl(locale, route.path))
  const lines: string[] = []

  lines.push('  <url>')
  lines.push(`    <loc>${loc}</loc>`)
  lines.push(`    <lastmod>${route.lastmod}</lastmod>`)

  // hreflang alternates — point to every priority locale + x-default
  for (const altLocale of SEO_PRIORITY_LOCALES) {
    const hreflang = HREFLANG_MAP[altLocale] ?? altLocale
    const href = escapeXml(localeUrl(altLocale, route.path))
    lines.push(`    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`)
  }
  lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(localeUrl(DEFAULT_LOCALE, route.path))}"/>`)

  lines.push('  </url>')
  return lines.join('\n')
}

function buildLocaleSitemap(routes: RouteEntry[], locale: string): string {
  const header = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ].join('\n')

  const body = routes.map((r) => buildUrlEntry(r, locale)).join('\n')
  return `${header}\n${body}\n</urlset>\n`
}

// ── Sitemap Index Generation ────────────────────────────────────────────────

function buildSitemapIndex(locales: readonly string[]): string {
  const header = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ].join('\n')

  const entries = locales
    .map((locale) => [
      '  <sitemap>',
      `    <loc>${escapeXml(`${ORIGIN}/sitemap-${locale}.xml`)}</loc>`,
      `    <lastmod>${TODAY}</lastmod>`,
      '  </sitemap>',
    ].join('\n'))
    .join('\n')

  return `${header}\n${entries}\n</sitemapindex>\n`
}

// ── Ping Search Engines ─────────────────────────────────────────────────────

async function pingSearchEngines() {
  const sitemapUrl = encodeURIComponent(`${ORIGIN}/sitemap.xml`)
  const endpoints = [
    `https://www.google.com/ping?sitemap=${sitemapUrl}`,
    `https://www.bing.com/ping?sitemap=${sitemapUrl}`,
  ]

  for (const url of endpoints) {
    try {
      const res = await fetch(url)
      console.log(`  Pinged ${new URL(url).hostname}: ${res.status}`)
    } catch (err) {
      console.warn(`  WARNING: Could not ping ${url}: ${err}`)
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Fetch dynamic content in parallel
  console.log('Fetching dynamic content...')
  const [blogPosts, caseStudies, authors] = await Promise.all([
    fetchJson<BlogPost>(`${API_URL}/blog`, 'blog posts'),
    FEATURE_CASE_STUDIES ? fetchJson<CaseStudy>(`${API_URL}/case-studies`, 'case studies') : Promise.resolve([]),
    fetchJson<Author>(`${API_URL}/authors`, 'team members'),
  ])

  console.log(`  Blog posts:   ${blogPosts.length}`)
  console.log(`  Case studies: ${caseStudies.length}`)
  console.log(`  Team members: ${authors.filter((a) => a.slug).length}`)

  // Build dynamic route entries
  const dynamicRoutes: RouteEntry[] = [
    ...blogPosts.map((post) => ({
      path: `/blog/${post.slug}`,
      lastmod: toIsoDate(post.publishedAt),
    })),
    ...(FEATURE_CASE_STUDIES ? caseStudies.map((cs) => ({
      path: `/case-studies/${cs.slug}`,
      lastmod: TODAY,
    })) : []),
    ...authors.filter((a) => a.slug).map((a) => ({
      path: `/team/${a.slug!}`,
      lastmod: TODAY,
    })),
  ]

  const allRoutes = [...STATIC_ROUTES, ...dynamicRoutes]

  // Generate per-locale sitemaps
  let totalUrls = 0
  for (const locale of SEO_PRIORITY_LOCALES) {
    const xml = buildLocaleSitemap(allRoutes, locale)
    const filename = `sitemap-${locale}.xml`
    writeFileSync(resolve(PUBLIC_DIR, filename), xml, 'utf-8')
    const urlCount = (xml.match(/<url>/g) ?? []).length
    totalUrls += urlCount
    console.log(`  ${filename}: ${urlCount} URLs`)
  }

  // Generate sitemap index
  const indexXml = buildSitemapIndex(SEO_PRIORITY_LOCALES)
  writeFileSync(resolve(PUBLIC_DIR, 'sitemap.xml'), indexXml, 'utf-8')

  console.log(`\nSitemap index + ${SEO_PRIORITY_LOCALES.length} sub-sitemaps generated (${totalUrls} total URLs)`)

  // Ping search engines
  if (process.env.SKIP_PING !== 'true') {
    console.log('\nPinging search engines...')
    await pingSearchEngines()
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
