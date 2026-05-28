/**
 * Cosmos → D1 migration script.
 *
 * Usage:
 *   npx tsx scripts/migrate-cosmos-to-d1.ts --export --out scripts/data/prestage
 *   npx tsx scripts/migrate-cosmos-to-d1.ts --import --in scripts/data/prestage
 *   npx tsx scripts/migrate-cosmos-to-d1.ts --import --in scripts/data/final --remote
 *   npx tsx scripts/migrate-cosmos-to-d1.ts --verify --in scripts/data/final --remote
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { execSync } from 'child_process'
import path from 'path'

// ─── Locale normalization ────────────────────────────────────
const TRANSLATOR_TO_BCP47: Record<string, string> = {
  bs: 'bs-BA',
  de: 'de-DE',
  hr: 'hr-HR',
  pt: 'pt-BR',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  nl: 'nl-NL',
  pl: 'pl-PL',
  ro: 'ro-RO',
  sk: 'sk-SK',
  sl: 'sl-SI',
  sr: 'sr-Cyrl',
  tr: 'tr-TR',
  uk: 'uk-UA',
}

export function normalizeLocale(lang: string): string {
  return TRANSLATOR_TO_BCP47[lang] ?? lang
}

function esc(val: unknown): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'boolean') return val ? '1' : '0'
  return `'${String(val).replace(/'/g, "''")}'`
}

// ─── Transform functions ─────────────────────────────────────

export function transformBlogPost(doc: Record<string, any>): {
  post: Record<string, any>
  tagSlugs: string[]
} | null {
  if (doc._deleted) return null
  return {
    post: {
      id: doc.id,
      slug: doc.slug,
      title: doc.title,
      excerpt: doc.excerpt ?? null,
      content: typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content ?? []),
      is_published: doc.isPublished ? 1 : 0,
      is_featured: doc.isFeatured ? 1 : 0,
      published_at: doc.publishedAt ?? null,
      read_time: doc.readTime ?? null,
      category: doc.category ?? null,
      subcategory: doc.subcategory ?? null,
      cover_image: doc.coverImage ?? null,
      banner_image: doc.bannerImage ?? null,
      author_id: doc.authorId ?? null,
      author_name: doc.author ?? doc.authorName ?? null,
      created_at: doc.createdAt ?? new Date().toISOString(),
      updated_at: doc.updatedAt ?? new Date().toISOString(),
    },
    tagSlugs: Array.isArray(doc.tags) ? doc.tags : [],
  }
}

export function transformBlogPostTranslation(doc: Record<string, any>): {
  id: string
  postSlug: string
  locale: string
  title: string | null
  excerpt: string | null
  content: string
  isAutoTranslated: number
  translatedAt: string
} | null {
  if (doc._deleted) return null
  const locale = normalizeLocale(doc.lang ?? doc.locale ?? 'unknown')
  return {
    id: doc.id,
    postSlug: doc.postSlug ?? doc.slug ?? '',
    locale,
    title: doc.title ?? null,
    excerpt: doc.excerpt ?? null,
    content: typeof doc.content === 'string' ? doc.content : JSON.stringify(doc.content ?? []),
    isAutoTranslated: doc.isAutoTranslated ? 1 : 0,
    translatedAt: doc.translatedAt ?? new Date().toISOString(),
  }
}

export function transformUser(doc: Record<string, any>): {
  user: Record<string, any>
  roleNames: string[]
} | null {
  if (doc._deleted) return null
  const socialLinks = (doc.socialLinks ?? {}) as Record<string, unknown>
  return {
    user: {
      id: doc.id,
      email: doc.email,
      password_hash: doc.passwordHash ?? null,
      first_name: doc.firstName ?? '',
      last_name: doc.lastName ?? '',
      phone_number: doc.phoneNumber ?? null,
      is_active: doc.isActive ? 1 : 0,
      is_opted_out: doc.isOptedOut ? 1 : 0,
      email_notifications: doc.emailNotifications !== false ? 1 : 0,
      sms_notifications: doc.smsNotifications ? 1 : 0,
      avatar_url: doc.avatarUrl ?? null,
      bio: doc.bio ?? null,
      profession: doc.profession ?? null,
      expertise: JSON.stringify(doc.expertise ?? []),
      social_linkedin: socialLinks.linkedIn ?? null,
      social_twitter: socialLinks.twitter ?? null,
      social_github: socialLinks.gitHub ?? null,
      social_website: socialLinks.website ?? null,
      slug: doc.slug ?? null,
      page_content: JSON.stringify(doc.pageContent ?? []),
      created_at: doc.createdAt ?? new Date().toISOString(),
      updated_at: doc.updatedAt ?? new Date().toISOString(),
    },
    roleNames: Array.isArray(doc.roles) ? doc.roles : [],
  }
}

export function transformCategory(doc: Record<string, any>): {
  category: Record<string, any>
  translations: Array<{ categoryId: string; locale: string; label: string }>
} | null {
  if (doc._deleted) return null
  const translations = Object.entries(doc.translations ?? {}).map(([lang, label]) => ({
    categoryId: doc.id,
    locale: normalizeLocale(lang),
    label: label as string,
  }))
  return {
    category: {
      id: doc.id,
      slug: doc.slug,
      label: doc.label,
      parent_id: doc.parentId ?? null,
      created_at: doc.createdAt ?? new Date().toISOString(),
      updated_at: doc.updatedAt ?? new Date().toISOString(),
    },
    translations,
  }
}

export function transformTag(doc: Record<string, any>): {
  tag: Record<string, any>
  translations: Array<{ tagId: string; locale: string; label: string }>
} | null {
  if (doc._deleted) return null
  const translations = Object.entries(doc.translations ?? {}).map(([lang, label]) => ({
    tagId: doc.id,
    locale: normalizeLocale(lang),
    label: label as string,
  }))
  return {
    tag: {
      id: doc.id,
      slug: doc.slug,
      label: doc.label,
      created_at: doc.createdAt ?? new Date().toISOString(),
      updated_at: doc.updatedAt ?? new Date().toISOString(),
    },
    translations,
  }
}

export function transformRole(doc: Record<string, any>): Record<string, any> | null {
  if (doc._deleted) return null
  return {
    id: doc.id,
    name: doc.name,
    slug: doc.slug ?? doc.name.toLowerCase().replace(/\s+/g, '-'),
    description: doc.description ?? null,
    permissions: typeof doc.permissions === 'string' ? doc.permissions : JSON.stringify(doc.permissions ?? []),
    is_system: doc.isSystem ? 1 : 0,
    created_at: doc.createdAt ?? new Date().toISOString(),
    updated_at: doc.updatedAt ?? new Date().toISOString(),
  }
}

export function transformCaseStudy(doc: Record<string, any>): {
  caseStudy: Record<string, any>
  decisions: Array<{ caseStudyId: string; decision: string; rationale: string; sortOrder: number }>
  results: Array<{ caseStudyId: string; metric: string; value: string; description: string | null; sortOrder: number }>
  translations: Array<{ caseStudyId: string; locale: string; title: string | null; description: string | null; challenge: string | null; solution: string | null; executiveSummary: string | null }>
} | null {
  if (doc._deleted) return null

  const decisions = (doc.architectureDecisions ?? []).map((d: any, i: number) => ({
    caseStudyId: doc.id,
    decision: d.decision,
    rationale: d.rationale,
    sortOrder: i,
  }))

  const results = (doc.results ?? []).map((r: any, i: number) => ({
    caseStudyId: doc.id,
    metric: r.metric,
    value: r.value,
    description: r.description ?? null,
    sortOrder: i,
  }))

  const translations = Object.entries(doc.translations ?? {}).map(([lang, t]: [string, any]) => ({
    caseStudyId: doc.id,
    locale: normalizeLocale(lang),
    title: t.title ?? null,
    description: t.description ?? null,
    challenge: t.challenge ?? null,
    solution: t.solution ?? null,
    executiveSummary: t.executiveSummary ?? null,
  }))

  return {
    caseStudy: {
      id: doc.id,
      slug: doc.slug,
      title: doc.title,
      client: doc.client ?? null,
      industry: doc.industry ?? null,
      description: doc.description ?? null,
      executive_summary: doc.executiveSummary ?? null,
      challenge: doc.challenge ?? null,
      solution: doc.solution ?? null,
      tech_stack: JSON.stringify(doc.techStack ?? []),
      tags: JSON.stringify(doc.tags ?? []),
      is_published: doc.isPublished ? 1 : 0,
      is_featured: doc.isFeatured ? 1 : 0,
      cover_image: doc.coverImage ?? null,
      created_at: doc.createdAt ?? new Date().toISOString(),
      updated_at: doc.updatedAt ?? new Date().toISOString(),
    },
    decisions,
    results,
    translations,
  }
}

// ─── SQL generation ──────────────────────────────────────────

function toInsertSql(table: string, row: Record<string, any>): string {
  const cols = Object.keys(row).join(', ')
  const vals = Object.values(row).map(esc).join(', ')
  return `INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${vals});`
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

// ─── Cosmos export ───────────────────────────────────────────

async function exportFromCosmos(outDir: string) {
  const endpoint = process.env.COSMOS_ENDPOINT
  const key = process.env.COSMOS_KEY
  const dbId = process.env.COSMOS_DATABASE ?? 'starthn'

  if (!endpoint || !key) {
    console.error('Set COSMOS_ENDPOINT and COSMOS_KEY env vars')
    process.exit(1)
  }

  // Dynamic import so @azure/cosmos is optional at test time
  const { CosmosClient } = await import('@azure/cosmos')

  mkdirSync(outDir, { recursive: true })
  const client = new CosmosClient({ endpoint, key })
  const database = client.database(dbId)

  const containers = [
    'roles', 'users', 'blogPosts', 'blogPostTranslations',
    'categories', 'tags', 'caseStudies', 'userPageTranslations',
    'processedImages', 'llmProviders', 'llmSettings',
  ]

  for (const containerName of containers) {
    try {
      const container = database.container(containerName)
      const { resources } = await container.items.readAll().fetchAll()
      const outFile = path.join(outDir, `${containerName}.json`)
      writeFileSync(outFile, JSON.stringify(resources, null, 2))
      console.log(`  ${containerName}: exported ${resources.length} docs → ${outFile}`)
    } catch (err: any) {
      console.warn(`  ${containerName}: SKIP (${err.code ?? err.message})`)
    }
  }

  console.log('\nExport complete.')
}

// ─── SQL import file generation ──────────────────────────────

export function generateImportSql(inDir: string): { sqlFiles: Map<string, string[]>; counts: Record<string, number> } {
  const sqlFiles = new Map<string, string[]>()
  const counts: Record<string, number> = {}

  function readDocs(name: string): Record<string, any>[] {
    const file = path.join(inDir, `${name}.json`)
    if (!existsSync(file)) return []
    return JSON.parse(readFileSync(file, 'utf-8'))
  }

  const stmts: string[] = []

  stmts.push('-- Delete existing migrated rows (dependency-safe order)')
  for (const tbl of [
    'blog_post_tags', 'blog_post_translations', 'blog_posts',
    'category_translations', 'categories',
    'tag_translations', 'tags',
    'case_study_decisions', 'case_study_results', 'case_study_translations', 'case_studies',
    'user_page_translations', 'user_roles', 'users',
    'roles', 'llm_providers', 'llm_settings', 'processed_images',
  ]) {
    stmts.push(`DELETE FROM ${tbl};`)
  }

  // Roles
  const roleDocs = readDocs('roles')
  const roleNameToId = new Map<string, string>()
  for (const doc of roleDocs) {
    const row = transformRole(doc)
    if (!row) continue
    roleNameToId.set(row.name, row.id)
    stmts.push(toInsertSql('roles', row))
  }
  counts.roles = roleDocs.filter(d => !d._deleted).length

  // Users
  const userDocs = readDocs('users')
  for (const doc of userDocs) {
    const result = transformUser(doc)
    if (!result) continue
    stmts.push(toInsertSql('users', result.user))
    for (const roleName of result.roleNames) {
      const roleId = roleNameToId.get(roleName)
      if (roleId) {
        stmts.push(`INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (${esc(result.user.id)}, ${esc(roleId)});`)
      }
    }
  }
  counts.users = userDocs.filter(d => !d._deleted).length

  // Blog posts
  const blogDocs = readDocs('blogPosts')
  for (const doc of blogDocs) {
    const result = transformBlogPost(doc)
    if (!result) continue
    stmts.push(toInsertSql('blog_posts', result.post))
    for (const tagSlug of result.tagSlugs) {
      stmts.push(
        `INSERT OR IGNORE INTO blog_post_tags (post_id, tag_id) SELECT ${esc(result.post.id)}, id FROM tags WHERE slug = ${esc(tagSlug)} OR label = ${esc(tagSlug)};`,
      )
    }
  }
  counts.blog_posts = blogDocs.filter(d => !d._deleted).length

  // Blog translations
  const transDocs = readDocs('blogPostTranslations')
  for (const doc of transDocs) {
    const t = transformBlogPostTranslation(doc)
    if (!t) continue
    stmts.push(
      `INSERT OR REPLACE INTO blog_post_translations (id, post_id, locale, title, excerpt, content, is_auto_translated, translated_at) SELECT ${esc(t.id)}, bp.id, ${esc(t.locale)}, ${esc(t.title)}, ${esc(t.excerpt)}, ${esc(t.content)}, ${t.isAutoTranslated}, ${esc(t.translatedAt)} FROM blog_posts bp WHERE bp.slug = ${esc(t.postSlug)};`,
    )
  }
  counts.blog_post_translations = transDocs.filter(d => !d._deleted).length

  // Categories
  const catDocs = readDocs('categories')
  for (const doc of catDocs) {
    const result = transformCategory(doc)
    if (!result) continue
    stmts.push(toInsertSql('categories', result.category))
    for (const t of result.translations) {
      stmts.push(
        `INSERT OR REPLACE INTO category_translations (id, category_id, locale, label, is_auto_translated, translated_at) VALUES (${esc(`${t.categoryId}:${t.locale}`)}, ${esc(t.categoryId)}, ${esc(t.locale)}, ${esc(t.label)}, 1, ${esc(new Date().toISOString())});`,
      )
    }
  }
  counts.categories = catDocs.filter(d => !d._deleted).length

  // Tags
  const tagDocs = readDocs('tags')
  for (const doc of tagDocs) {
    const result = transformTag(doc)
    if (!result) continue
    stmts.push(toInsertSql('tags', result.tag))
    for (const t of result.translations) {
      stmts.push(
        `INSERT OR REPLACE INTO tag_translations (id, tag_id, locale, label, is_auto_translated, translated_at) VALUES (${esc(`${t.tagId}:${t.locale}`)}, ${esc(t.tagId)}, ${esc(t.locale)}, ${esc(t.label)}, 1, ${esc(new Date().toISOString())});`,
      )
    }
  }
  counts.tags = tagDocs.filter(d => !d._deleted).length

  // Case studies
  const csDocs = readDocs('caseStudies')
  for (const doc of csDocs) {
    const result = transformCaseStudy(doc)
    if (!result) continue
    stmts.push(toInsertSql('case_studies', result.caseStudy))
    for (const d of result.decisions) {
      stmts.push(
        `INSERT INTO case_study_decisions (id, case_study_id, decision, rationale, sort_order) VALUES (${esc(crypto.randomUUID().replace(/-/g,''))}, ${esc(d.caseStudyId)}, ${esc(d.decision)}, ${esc(d.rationale)}, ${d.sortOrder});`,
      )
    }
    for (const r of result.results) {
      stmts.push(
        `INSERT INTO case_study_results (id, case_study_id, metric, value, description, sort_order) VALUES (${esc(crypto.randomUUID().replace(/-/g,''))}, ${esc(r.caseStudyId)}, ${esc(r.metric)}, ${esc(r.value)}, ${esc(r.description)}, ${r.sortOrder});`,
      )
    }
    for (const t of result.translations) {
      stmts.push(
        `INSERT OR REPLACE INTO case_study_translations (id, case_study_id, locale, title, description, challenge, solution, executive_summary, is_auto_translated, translated_at) VALUES (${esc(crypto.randomUUID().replace(/-/g,''))}, ${esc(t.caseStudyId)}, ${esc(t.locale)}, ${esc(t.title)}, ${esc(t.description)}, ${esc(t.challenge)}, ${esc(t.solution)}, ${esc(t.executiveSummary)}, 1, ${esc(new Date().toISOString())});`,
      )
    }
  }
  counts.case_studies = csDocs.filter(d => !d._deleted).length

  // User page translations
  const uptDocs = readDocs('userPageTranslations')
  for (const doc of uptDocs) {
    if (doc._deleted) continue
    const locale = normalizeLocale(doc.lang ?? doc.locale ?? 'unknown')
    stmts.push(
      `INSERT OR REPLACE INTO user_page_translations (id, user_id, locale, bio, page_content, is_auto_translated, translated_at) VALUES (${esc(doc.id)}, ${esc(doc.userId)}, ${esc(locale)}, ${esc(doc.bio ?? null)}, ${esc(JSON.stringify(doc.pageContent ?? []))}, ${doc.isAutoTranslated ? 1 : 0}, ${esc(doc.translatedAt ?? new Date().toISOString())});`,
    )
  }
  counts.user_page_translations = uptDocs.filter(d => !d._deleted).length

  // Processed images
  const imgDocs = readDocs('processedImages')
  for (const doc of imgDocs) {
    if (doc._deleted) continue
    stmts.push(
      `INSERT OR REPLACE INTO processed_images (path, container, format, widths, processed_at, source) VALUES (${esc(doc.path)}, ${esc(doc.container ?? 'blog-images')}, ${esc(doc.format ?? 'webp')}, ${esc(JSON.stringify(doc.widths ?? []))}, ${esc(doc.processedAt)}, ${esc(doc.source ?? 'backend')});`,
    )
  }
  counts.processed_images = imgDocs.filter(d => !d._deleted).length

  // LLM providers
  const llmProvDocs = readDocs('llmProviders')
  for (const doc of llmProvDocs) {
    if (doc._deleted) continue
    stmts.push(
      `INSERT OR REPLACE INTO llm_providers (id, key, name, api, base_url, api_key, headers, models, is_active, created_at, updated_at) VALUES (${esc(doc.id)}, ${esc(doc.key)}, ${esc(doc.name)}, ${esc(doc.api ?? 'openai')}, ${esc(doc.baseUrl)}, ${esc(doc.apiKey)}, ${esc(JSON.stringify(doc.headers ?? {}))}, ${esc(JSON.stringify(doc.models ?? []))}, ${doc.isActive ? 1 : 0}, ${esc(doc.createdAt ?? new Date().toISOString())}, ${esc(doc.updatedAt ?? new Date().toISOString())});`,
    )
  }
  counts.llm_providers = llmProvDocs.filter(d => !d._deleted).length

  // LLM settings
  const llmSettDocs = readDocs('llmSettings')
  for (const doc of llmSettDocs) {
    if (doc._deleted) continue
    stmts.push(
      `INSERT OR REPLACE INTO llm_settings (id, chat_provider_key, chat_model_id, review_provider_key, review_model_id, translation_provider_key, translation_model_id, updated_at) VALUES (${esc(doc.id ?? 'global')}, ${esc(doc.chatProviderKey ?? null)}, ${esc(doc.chatModelId ?? null)}, ${esc(doc.reviewProviderKey ?? null)}, ${esc(doc.reviewModelId ?? null)}, ${esc(doc.translationProviderKey ?? null)}, ${esc(doc.translationModelId ?? null)}, ${esc(doc.updatedAt ?? new Date().toISOString())});`,
    )
  }

  const CHUNK_SIZE = 500
  const allChunks = chunk(stmts, CHUNK_SIZE)
  const files: string[] = []
  for (let i = 0; i < allChunks.length; i++) {
    const fname = `chunk-${String(i).padStart(4, '0')}.sql`
    files.push(fname)
    sqlFiles.set(fname, allChunks[i])
  }

  return { sqlFiles, counts }
}

// ─── D1 import ───────────────────────────────────────────────

function runImport(inDir: string, remote: boolean) {
  const { sqlFiles, counts } = generateImportSql(inDir)

  console.log('\nTransformed source counts:')
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table.padEnd(30)} ${count}`)
  }

  const sqlDir = path.join(inDir, 'sql')
  mkdirSync(sqlDir, { recursive: true })

  let total = 0
  for (const [fname, stmts] of sqlFiles) {
    const filePath = path.join(sqlDir, fname)
    writeFileSync(filePath, stmts.join('\n') + '\n')
    total += stmts.filter(s => !s.startsWith('--')).length
  }
  console.log(`\nGenerated ${sqlFiles.size} SQL chunks (${total} statements) in ${sqlDir}`)

  if (!remote) {
    console.log('\nDry run — SQL files written. Pass --remote to execute against D1.')
    return
  }

  const sqlFileList = readdirSync(sqlDir).filter(f => f.endsWith('.sql')).sort()
  for (const fname of sqlFileList) {
    const filePath = path.join(sqlDir, fname)
    console.log(`  Executing ${fname}...`)
    execSync(`npx wrangler d1 execute starthn-db --remote --file "${filePath}"`, { stdio: 'inherit' })
  }
  console.log('\nImport complete.')
}

// ─── Verification ─────────────────────────────────────────────

async function runVerify(inDir: string, remote: boolean) {
  const { counts: sourceCounts } = generateImportSql(inDir)

  if (!remote) {
    console.log('Dry run — would verify against production D1. Pass --remote to run.')
    return
  }

  const D1_DB_NAME = 'starthn-db'

  async function d1Count(table: string): Promise<number> {
    const out = execSync(
      `npx wrangler d1 execute ${D1_DB_NAME} --remote --command "SELECT COUNT(*) as cnt FROM ${table}" --json`,
    ).toString()
    const rows = JSON.parse(out)
    return rows?.[0]?.results?.[0]?.cnt ?? 0
  }

  console.log('\nVerification:')
  let failed = false
  for (const [table, expected] of Object.entries(sourceCounts)) {
    const actual = await d1Count(table)
    const ok = actual === expected
    console.log(`  ${table.padEnd(30)} source: ${String(expected).padStart(5)}   d1: ${String(actual).padStart(5)}   ${ok ? 'OK' : 'MISMATCH'}`)
    if (!ok) failed = true
  }

  if (failed) {
    console.error('\nVerification FAILED — counts do not match.')
    process.exit(1)
  }
  console.log('\nVerification PASSED.')
}

// ─── CLI entry ───────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const mode = args.find(a => ['--export', '--import', '--verify'].includes(a))
  const outIdx = args.indexOf('--out')
  const inIdx = args.indexOf('--in')
  const out = outIdx >= 0 ? args[outIdx + 1] : undefined
  const inDir = inIdx >= 0 ? args[inIdx + 1] : undefined
  const remote = args.includes('--remote')

  if (mode === '--export') {
    if (!out) { console.error('--export requires --out <dir>'); process.exit(1) }
    console.log(`Exporting from Cosmos → ${out}`)
    await exportFromCosmos(out)
  } else if (mode === '--import') {
    if (!inDir) { console.error('--import requires --in <dir>'); process.exit(1) }
    console.log(`Importing from ${inDir} → D1 (remote: ${remote})`)
    runImport(inDir, remote)
  } else if (mode === '--verify') {
    if (!inDir) { console.error('--verify requires --in <dir>'); process.exit(1) }
    console.log(`Verifying ${inDir} against D1 (remote: ${remote})`)
    await runVerify(inDir, remote)
  } else {
    console.error('Usage: npx tsx scripts/migrate-cosmos-to-d1.ts --export|--import|--verify [options]')
    process.exit(1)
  }
}

// Only run as CLI entry point — not when imported by tests
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] != null &&
  (process.argv[1].endsWith('migrate-cosmos-to-d1.ts') ||
    process.argv[1].endsWith('migrate-cosmos-to-d1.js'))

if (isMain) {
  main().catch(err => { console.error(err); process.exit(1) })
}
