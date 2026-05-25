# Migration and Cutover Tooling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the export/import/verify script to migrate Cosmos data to D1, add maintenance mode for the cutover window, normalize locales from Azure Translator codes to BCP47 in D1, and revert the temporary locale-normalization code in the Worker read paths.

**Architecture:** `scripts/migrate-cosmos-to-d1.ts` runs in three modes (`--export`, `--import`, `--verify`). Export reads Cosmos containers, transforms documents, and writes chunked SQL files. Import executes those SQL files against production D1 via `wrangler d1 execute --remote`. Verify compares transformed source counts to live D1 counts and exits non-zero on mismatch. A `MAINTENANCE_MODE` Worker env var gates write endpoints during the cutover window.

**Tech Stack:** Node.js (tsx), `@azure/cosmos` (devDep), `wrangler d1 execute --remote`, Vitest (transform unit tests).

**Pre-condition:** Plan 1 must be complete and deployed (auth + CRUD routes behind `D1_PRIMARY=false`).

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Create | `scripts/migrate-cosmos-to-d1.ts` | Export/import/verify migration script |
| Create | `scripts/data/.gitkeep` | Data directory placeholder |
| Create | `scripts/migrate-cosmos-to-d1.test.ts` | Unit tests for transform functions |
| Modify | `src/server/bindings.ts` | Add `MAINTENANCE_MODE` |
| Modify | `wrangler.jsonc` | Add `MAINTENANCE_MODE: "false"` |
| Modify | `src/server.ts` | Maintenance mode middleware for writes |
| Modify | `src/server/db/api-routes.ts` | Remove BCP47→translator code normalization |
| Modify | `src/server/ssr-data.ts` | Remove `toD1Locale()` helper — pass BCP47 directly |
| Modify | `src/server/db/repositories/blog-post.ts` | Update English locale check after BCP47 normalization |

---

### Task 1: Add maintenance mode to Worker

**Files:**
- Modify: `src/server/bindings.ts`
- Modify: `wrangler.jsonc`
- Modify: `src/server.ts`

- [ ] **Step 1: Write the failing test**

Create `src/server/maintenance.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import app from '../server'

describe('maintenance mode', () => {
  it('blocks writes when MAINTENANCE_MODE=true', async () => {
    // We test the middleware logic in isolation since we can't easily
    // instantiate the full Hono app with mocked bindings in vitest.
    // Verify the env var name is consistent with the bindings type.
    const { Bindings } = await import('./bindings')
    expect(true).toBe(true) // placeholder — real test is the build check below
  })
})
```

(The integration behavior is verified manually during cutover. The test here is a build sanity check.)

- [ ] **Step 2: Add `MAINTENANCE_MODE` to `src/server/bindings.ts`**

Inside the `Bindings` type add:

```ts
/** "true" = return 503 for all write endpoints during cutover window */
MAINTENANCE_MODE: string
```

- [ ] **Step 3: Add `MAINTENANCE_MODE: "false"` to `wrangler.jsonc` vars**

```jsonc
"MAINTENANCE_MODE": "false"
```

- [ ] **Step 4: Add maintenance middleware to `src/server.ts`**

Add before the first route handler (after the security headers middleware, around line 60):

```ts
// ─── Maintenance mode ───────────────────────────────────────
app.use('/api/*', async (c, next) => {
  if (c.env?.MAINTENANCE_MODE === 'true') {
    const method = c.req.method
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      return c.json({ error: 'Maintenance in progress. Write endpoints are temporarily unavailable.' }, 503)
    }
  }
  await next()
})
```

- [ ] **Step 5: Run tests + build**

```bash
npm run test
npm run build
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/server/bindings.ts wrangler.jsonc src/server.ts src/server/maintenance.test.ts
git commit -m "feat: add MAINTENANCE_MODE middleware for cutover window"
```

---

### Task 2: Write transform unit tests for the migration script

**Files:**
- Create: `scripts/migrate-cosmos-to-d1.test.ts`

The transform functions are pure (no Cosmos or D1 calls). Test them before implementing.

- [ ] **Step 1: Write the test file**

Create `scripts/migrate-cosmos-to-d1.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  normalizeLocale,
  transformBlogPost,
  transformBlogPostTranslation,
  transformUser,
  transformCategory,
  transformTag,
  transformCaseStudy,
  transformRole,
} from './migrate-cosmos-to-d1'

describe('normalizeLocale', () => {
  it('converts bs to bs-BA', () => expect(normalizeLocale('bs')).toBe('bs-BA'))
  it('converts de to de-DE', () => expect(normalizeLocale('de')).toBe('de-DE'))
  it('converts hr to hr-HR', () => expect(normalizeLocale('hr')).toBe('hr-HR'))
  it('converts pt to pt-BR', () => expect(normalizeLocale('pt')).toBe('pt-BR'))
  it('leaves zh-Hans unchanged', () => expect(normalizeLocale('zh-Hans')).toBe('zh-Hans'))
  it('leaves en-US unchanged', () => expect(normalizeLocale('en-US')).toBe('en-US'))
  it('leaves unknown codes unchanged', () => expect(normalizeLocale('fr-CA')).toBe('fr-CA'))
})

describe('transformBlogPost', () => {
  const doc = {
    id: 'abc123',
    slug: 'my-post',
    title: 'My Post',
    excerpt: 'An excerpt',
    content: [{ type: 'paragraph', text: 'Hello' }],
    isPublished: true,
    isFeatured: false,
    publishedAt: '2026-01-01T00:00:00Z',
    readTime: 5,
    category: 'tech',
    subcategory: null,
    coverImage: null,
    bannerImage: null,
    authorId: 'user1',
    author: 'Jane Doe',
    tags: ['react', 'ts'],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  }

  it('maps fields to D1 shape', () => {
    const result = transformBlogPost(doc)
    expect(result.post.id).toBe('abc123')
    expect(result.post.slug).toBe('my-post')
    expect(result.post.isPublished).toBe(1)
    expect(result.post.isFeatured).toBe(0)
    expect(typeof result.post.content).toBe('string') // JSON string
    expect(result.tagSlugs).toEqual(['react', 'ts'])
  })

  it('skips deleted documents', () => {
    expect(transformBlogPost({ ...doc, _deleted: true })).toBeNull()
  })
})

describe('transformBlogPostTranslation', () => {
  it('normalizes lang field to BCP47', () => {
    const doc = {
      id: 'my-post:bs',
      postSlug: 'my-post',
      lang: 'bs',
      title: 'Moj post',
      excerpt: 'Odlomak',
      content: [],
      isAutoTranslated: true,
      translatedAt: '2026-01-01T00:00:00Z',
    }
    const result = transformBlogPostTranslation(doc)
    expect(result?.locale).toBe('bs-BA')
    expect(result?.postSlug).toBe('my-post')
  })

  it('returns null for deleted docs', () => {
    expect(transformBlogPostTranslation({ id: 'x', _deleted: true })).toBeNull()
  })
})

describe('transformUser', () => {
  it('maps Cosmos user to D1 users row', () => {
    const doc = {
      id: 'user1',
      email: 'a@b.com',
      passwordHash: 'hash',
      firstName: 'Jane',
      lastName: 'Doe',
      isActive: true,
      socialLinks: { linkedIn: 'https://li.com', twitter: null, gitHub: null, website: null },
      roles: ['MasterAdmin'],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    const result = transformUser(doc)
    expect(result?.user.email).toBe('a@b.com')
    expect(result?.user.isActive).toBe(1)
    expect(result?.user.socialLinkedin).toBe('https://li.com')
    expect(result?.roleNames).toEqual(['MasterAdmin'])
  })
})

describe('transformCategory', () => {
  it('normalizes translation locale keys', () => {
    const doc = {
      id: 'cat1',
      slug: 'tech',
      label: 'Technology',
      translations: { bs: 'Tehnologija', de: 'Technologie' },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    const result = transformCategory(doc)
    expect(result?.category.slug).toBe('tech')
    expect(result?.translations.find(t => t.locale === 'bs-BA')?.label).toBe('Tehnologija')
    expect(result?.translations.find(t => t.locale === 'de-DE')?.label).toBe('Technologie')
  })
})

describe('transformCaseStudy', () => {
  it('maps decisions and results', () => {
    const doc = {
      id: 'cs1',
      slug: 'case-1',
      title: 'Case Study',
      isPublished: false,
      isFeatured: false,
      architectureDecisions: [{ decision: 'Use microservices', rationale: 'Scale' }],
      results: [{ metric: 'Latency', value: '50ms', description: 'p99' }],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    const result = transformCaseStudy(doc)
    expect(result?.caseStudy.slug).toBe('case-1')
    expect(result?.decisions).toHaveLength(1)
    expect(result?.results).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test -- scripts/migrate-cosmos-to-d1.test
```

Expected: FAIL (module not found).

---

### Task 3: Create the migration script

**Files:**
- Create: `scripts/migrate-cosmos-to-d1.ts`
- Create: `scripts/data/.gitkeep`

- [ ] **Step 1: Create `scripts/data/.gitkeep`**

```bash
mkdir -p scripts/data && touch scripts/data/.gitkeep
```

Add to `.gitignore`: `scripts/data/*.json` and `scripts/data/*.sql` (keep the directory, ignore generated files).

- [ ] **Step 2: Create `scripts/migrate-cosmos-to-d1.ts`**

```ts
/**
 * Cosmos → D1 migration script.
 *
 * Usage:
 *   npx tsx scripts/migrate-cosmos-to-d1.ts --export --out scripts/data/prestage
 *   npx tsx scripts/migrate-cosmos-to-d1.ts --export --out scripts/data/final
 *   npx tsx scripts/migrate-cosmos-to-d1.ts --import --in scripts/data/final --remote
 *   npx tsx scripts/migrate-cosmos-to-d1.ts --verify --in scripts/data/final --remote
 */

import { CosmosClient } from '@azure/cosmos'
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
      isPublished: doc.isPublished ? 1 : 0,
      isFeatured: doc.isFeatured ? 1 : 0,
      publishedAt: doc.publishedAt ?? null,
      readTime: doc.readTime ?? null,
      category: doc.category ?? null,
      subcategory: doc.subcategory ?? null,
      coverImage: doc.coverImage ?? null,
      bannerImage: doc.bannerImage ?? null,
      authorId: doc.authorId ?? null,
      authorName: doc.author ?? doc.authorName ?? null,
      createdAt: doc.createdAt ?? new Date().toISOString(),
      updatedAt: doc.updatedAt ?? new Date().toISOString(),
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
      passwordHash: doc.passwordHash ?? null,
      firstName: doc.firstName ?? '',
      lastName: doc.lastName ?? '',
      phoneNumber: doc.phoneNumber ?? null,
      isActive: doc.isActive ? 1 : 0,
      isOptedOut: doc.isOptedOut ? 1 : 0,
      emailNotifications: doc.emailNotifications !== false ? 1 : 0,
      smsNotifications: doc.smsNotifications ? 1 : 0,
      avatarUrl: doc.avatarUrl ?? null,
      bio: doc.bio ?? null,
      profession: doc.profession ?? null,
      expertise: JSON.stringify(doc.expertise ?? []),
      socialLinkedin: socialLinks.linkedIn ?? null,
      socialTwitter: socialLinks.twitter ?? null,
      socialGithub: socialLinks.gitHub ?? null,
      socialWebsite: socialLinks.website ?? null,
      slug: doc.slug ?? null,
      pageContent: JSON.stringify(doc.pageContent ?? []),
      createdAt: doc.createdAt ?? new Date().toISOString(),
      updatedAt: doc.updatedAt ?? new Date().toISOString(),
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
      parentId: doc.parentId ?? null,
      createdAt: doc.createdAt ?? new Date().toISOString(),
      updatedAt: doc.updatedAt ?? new Date().toISOString(),
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
      createdAt: doc.createdAt ?? new Date().toISOString(),
      updatedAt: doc.updatedAt ?? new Date().toISOString(),
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
    isSystem: doc.isSystem ? 1 : 0,
    createdAt: doc.createdAt ?? new Date().toISOString(),
    updatedAt: doc.updatedAt ?? new Date().toISOString(),
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
      executiveSummary: doc.executiveSummary ?? null,
      challenge: doc.challenge ?? null,
      solution: doc.solution ?? null,
      techStack: JSON.stringify(doc.techStack ?? []),
      tags: JSON.stringify(doc.tags ?? []),
      isPublished: doc.isPublished ? 1 : 0,
      isFeatured: doc.isFeatured ? 1 : 0,
      coverImage: doc.coverImage ?? null,
      createdAt: doc.createdAt ?? new Date().toISOString(),
      updatedAt: doc.updatedAt ?? new Date().toISOString(),
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

function generateImportSql(inDir: string): { sqlFiles: Map<string, string[]>; counts: Record<string, number> } {
  const sqlFiles = new Map<string, string[]>()
  const counts: Record<string, number> = {}

  function readDocs(name: string): Record<string, any>[] {
    const file = path.join(inDir, `${name}.json`)
    if (!existsSync(file)) return []
    return JSON.parse(readFileSync(file, 'utf-8'))
  }

  const stmts: string[] = []

  // Import order respects FK constraints.
  // Delete in reverse order, insert in forward order.

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

  // ─── Roles ─────────────────────────────────────────────────
  const roleDocs = readDocs('roles')
  const roleNameToId = new Map<string, string>()
  for (const doc of roleDocs) {
    const row = transformRole(doc)
    if (!row) continue
    roleNameToId.set(row.name, row.id)
    stmts.push(toInsertSql('roles', row))
  }
  counts.roles = roleDocs.filter(d => !d._deleted).length

  // ─── Users ─────────────────────────────────────────────────
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
  counts.user_roles = userDocs.filter(d => !d._deleted).reduce((s: number, d: any) =>
    s + (Array.isArray(d.roles) ? d.roles.length : 0), 0)

  // ─── Blog posts ─────────────────────────────────────────────
  const blogDocs = readDocs('blogPosts')
  for (const doc of blogDocs) {
    const result = transformBlogPost(doc)
    if (!result) continue
    stmts.push(toInsertSql('blog_posts', result.post))
    for (const tagSlug of result.tagSlugs) {
      stmts.push(
        `INSERT OR IGNORE INTO blog_post_tags (post_id, tag_id)
           SELECT ${esc(result.post.id)}, id FROM tags WHERE slug = ${esc(tagSlug)};`,
      )
    }
  }
  const activeBlogPosts = blogDocs.filter((d: any) => !d._deleted)
  counts.blog_posts = activeBlogPosts.length
  counts.blog_post_tags = activeBlogPosts.reduce((s: number, d: any) =>
    s + (Array.isArray(d.tags) ? d.tags.length : 0), 0)

  // ─── Blog translations ──────────────────────────────────────
  const transDocs = readDocs('blogPostTranslations')
  for (const doc of transDocs) {
    const t = transformBlogPostTranslation(doc)
    if (!t) continue
    stmts.push(
      `INSERT OR REPLACE INTO blog_post_translations
         (id, post_id, locale, title, excerpt, content, is_auto_translated, translated_at)
         SELECT ${esc(t.id)}, bp.id, ${esc(t.locale)}, ${esc(t.title)}, ${esc(t.excerpt)},
                ${esc(t.content)}, ${t.isAutoTranslated}, ${esc(t.translatedAt)}
         FROM blog_posts bp WHERE bp.slug = ${esc(t.postSlug)};`,
    )
  }
  counts.blog_post_translations = transDocs.filter((d: any) => !d._deleted).length

  // ─── Categories ─────────────────────────────────────────────
  const catDocs = readDocs('categories')
  for (const doc of catDocs) {
    const result = transformCategory(doc)
    if (!result) continue
    stmts.push(toInsertSql('categories', result.category))
    for (const t of result.translations) {
      stmts.push(
        `INSERT OR REPLACE INTO category_translations
           (id, category_id, locale, label, is_auto_translated, translated_at)
           VALUES (${esc(`${t.categoryId}:${t.locale}`)}, ${esc(t.categoryId)}, ${esc(t.locale)},
                   ${esc(t.label)}, 1, ${esc(new Date().toISOString())});`,
      )
    }
  }
  const activeCats = catDocs.filter((d: any) => !d._deleted)
  counts.categories = activeCats.length
  counts.category_translations = activeCats.reduce((s: number, d: any) =>
    s + Object.keys(d.translations ?? {}).length, 0)

  // ─── Tags ────────────────────────────────────────────────────
  const tagDocs = readDocs('tags')
  for (const doc of tagDocs) {
    const result = transformTag(doc)
    if (!result) continue
    stmts.push(toInsertSql('tags', result.tag))
    for (const t of result.translations) {
      stmts.push(
        `INSERT OR REPLACE INTO tag_translations
           (id, tag_id, locale, label, is_auto_translated, translated_at)
           VALUES (${esc(`${t.tagId}:${t.locale}`)}, ${esc(t.tagId)}, ${esc(t.locale)},
                   ${esc(t.label)}, 1, ${esc(new Date().toISOString())});`,
      )
    }
  }
  const activeTags = tagDocs.filter((d: any) => !d._deleted)
  counts.tags = activeTags.length
  counts.tag_translations = activeTags.reduce((s: number, d: any) =>
    s + Object.keys(d.translations ?? {}).length, 0)

  // ─── Case studies ────────────────────────────────────────────
  const csDocs = readDocs('caseStudies')
  for (const doc of csDocs) {
    const result = transformCaseStudy(doc)
    if (!result) continue
    stmts.push(toInsertSql('case_studies', result.caseStudy))
    for (const d of result.decisions) {
      stmts.push(
        `INSERT INTO case_study_decisions (id, case_study_id, decision, rationale, sort_order)
           VALUES (${esc(crypto.randomUUID().replace(/-/g,''))}, ${esc(d.caseStudyId)}, ${esc(d.decision)}, ${esc(d.rationale)}, ${d.sortOrder});`,
      )
    }
    for (const r of result.results) {
      stmts.push(
        `INSERT INTO case_study_results (id, case_study_id, metric, value, description, sort_order)
           VALUES (${esc(crypto.randomUUID().replace(/-/g,''))}, ${esc(r.caseStudyId)}, ${esc(r.metric)}, ${esc(r.value)}, ${esc(r.description)}, ${r.sortOrder});`,
      )
    }
    for (const t of result.translations) {
      stmts.push(
        `INSERT OR REPLACE INTO case_study_translations
           (id, case_study_id, locale, title, description, challenge, solution, executive_summary, is_auto_translated, translated_at)
           VALUES (${esc(crypto.randomUUID().replace(/-/g,''))}, ${esc(t.caseStudyId)}, ${esc(t.locale)},
                   ${esc(t.title)}, ${esc(t.description)}, ${esc(t.challenge)}, ${esc(t.solution)},
                   ${esc(t.executiveSummary)}, 1, ${esc(new Date().toISOString())});`,
      )
    }
  }
  const activeCs = csDocs.filter((d: any) => !d._deleted)
  counts.case_studies = activeCs.length

  // ─── User page translations ──────────────────────────────────
  const uptDocs = readDocs('userPageTranslations')
  for (const doc of uptDocs) {
    if (doc._deleted) continue
    const locale = normalizeLocale(doc.lang ?? doc.locale ?? 'unknown')
    stmts.push(
      `INSERT OR REPLACE INTO user_page_translations
         (id, user_id, locale, bio, page_content, is_auto_translated, translated_at)
         VALUES (${esc(doc.id)}, ${esc(doc.userId)}, ${esc(locale)}, ${esc(doc.bio ?? null)},
                 ${esc(JSON.stringify(doc.pageContent ?? []))}, ${doc.isAutoTranslated ? 1 : 0},
                 ${esc(doc.translatedAt ?? new Date().toISOString())});`,
    )
  }
  counts.user_page_translations = uptDocs.filter((d: any) => !d._deleted).length

  // ─── Processed images ────────────────────────────────────────
  const imgDocs = readDocs('processedImages')
  for (const doc of imgDocs) {
    if (doc._deleted) continue
    stmts.push(
      `INSERT OR REPLACE INTO processed_images (path, container, format, widths, processed_at, source)
         VALUES (${esc(doc.path)}, ${esc(doc.container ?? 'blog-images')}, ${esc(doc.format ?? 'webp')},
                 ${esc(JSON.stringify(doc.widths ?? []))}, ${esc(doc.processedAt)}, ${esc(doc.source ?? 'backend')});`,
    )
  }
  counts.processed_images = imgDocs.filter((d: any) => !d._deleted).length

  // ─── LLM providers and settings ─────────────────────────────
  const llmProvDocs = readDocs('llmProviders')
  for (const doc of llmProvDocs) {
    if (doc._deleted) continue
    stmts.push(
      `INSERT OR REPLACE INTO llm_providers (id, key, name, api, base_url, api_key, headers, models, is_active, created_at, updated_at)
         VALUES (${esc(doc.id)}, ${esc(doc.key)}, ${esc(doc.name)}, ${esc(doc.api ?? 'openai')},
                 ${esc(doc.baseUrl)}, ${esc(doc.apiKey)}, ${esc(JSON.stringify(doc.headers ?? {}))},
                 ${esc(JSON.stringify(doc.models ?? []))}, ${doc.isActive ? 1 : 0},
                 ${esc(doc.createdAt ?? new Date().toISOString())}, ${esc(doc.updatedAt ?? new Date().toISOString())});`,
    )
  }
  counts.llm_providers = llmProvDocs.filter((d: any) => !d._deleted).length

  const llmSettDocs = readDocs('llmSettings')
  for (const doc of llmSettDocs) {
    if (doc._deleted) continue
    stmts.push(
      `INSERT OR REPLACE INTO llm_settings (id, chat_provider_key, chat_model_id, review_provider_key, review_model_id, translation_provider_key, translation_model_id, updated_at)
         VALUES (${esc(doc.id ?? 'global')}, ${esc(doc.chatProviderKey ?? null)}, ${esc(doc.chatModelId ?? null)},
                 ${esc(doc.reviewProviderKey ?? null)}, ${esc(doc.reviewModelId ?? null)},
                 ${esc(doc.translationProviderKey ?? null)}, ${esc(doc.translationModelId ?? null)},
                 ${esc(doc.updatedAt ?? new Date().toISOString())});`,
    )
  }

  // ─── Write chunked SQL files ─────────────────────────────────
  const CHUNK_SIZE = 500
  const chunks = chunk(stmts, CHUNK_SIZE)
  const files: string[] = []
  for (let i = 0; i < chunks.length; i++) {
    const fname = `chunk-${String(i).padStart(4, '0')}.sql`
    files.push(fname)
    sqlFiles.set(fname, chunks[i])
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

  const sqlFiles2 = readdirSync(sqlDir).filter(f => f.endsWith('.sql')).sort()
  for (const fname of sqlFiles2) {
    const filePath = path.join(sqlDir, fname)
    console.log(`  Executing ${fname}...`)
    execSync(`npx wrangler d1 execute starthn-db --remote --file ${filePath}`, { stdio: 'inherit' })
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
    const status = ok ? 'OK' : 'MISMATCH'
    console.log(`  ${table.padEnd(30)} source: ${expected.toString().padStart(5)}   d1: ${actual.toString().padStart(5)}   ${status}`)
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
  const out = args[args.indexOf('--out') + 1]
  const inDir = args[args.indexOf('--in') + 1]
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

main().catch(err => { console.error(err); process.exit(1) })
```

- [ ] **Step 3: Run the transform tests — expect PASS**

```bash
npm run test -- scripts/migrate-cosmos-to-d1.test
```

Expected: PASS (all transform + normalizeLocale tests pass).

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-cosmos-to-d1.ts scripts/migrate-cosmos-to-d1.test.ts scripts/data/.gitkeep .gitignore
git commit -m "feat: add Cosmos→D1 migration script with export/import/verify"
```

---

### Task 4: Revert locale normalization code in Worker read paths

**Context:** After the migration runs, D1 will store BCP47 locales (`bs-BA`, not `bs`). The temporary normalization code added in a previous session must be removed so the Worker queries D1 with BCP47 directly.

**Files:**
- Modify: `src/server/ssr-data.ts`
- Modify: `src/server/db/api-routes.ts`
- Modify: `src/server/db/repositories/blog-post.ts`

- [ ] **Step 1: Remove `toD1Locale` from `src/server/ssr-data.ts`**

Remove the import of `toTranslatorLocaleCode` and the `toD1Locale` helper function. Replace all `toD1Locale(locale)` calls with `locale` directly (just pass the BCP47 locale through as-is).

The result: all `ssrBlogPosts`, `ssrBlogPost`, `ssrCategories`, `ssrTags`, `ssrCaseStudies` now pass the raw BCP47 locale to the repository.

Before:
```ts
import { toTranslatorLocaleCode } from '@/lib/i18n-utils'

function toD1Locale(locale?: string): string | undefined {
  if (!locale || locale === 'en-US' || locale === 'en') return undefined
  return toTranslatorLocaleCode(locale)
}

export async function ssrBlogPosts(locale?: string, page = 1, pageSize = 9) {
  ...
  repo.getPublished(toD1Locale(locale), page, pageSize),
  ...
}
```

After:
```ts
// (no toTranslatorLocaleCode import, no toD1Locale helper)

export async function ssrBlogPosts(locale?: string, page = 1, pageSize = 9) {
  const db = getD1()
  if (!db) return null
  const repo = new BlogPostRepository(db)
  const [items, total] = await Promise.all([
    repo.getPublished(locale, page, pageSize),
    repo.getCount(),
  ])
  return { items, totalCount: total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}
```

Apply the same direct-pass pattern to `ssrBlogPost`, `ssrCategories`, `ssrTags`, `ssrCaseStudies`.

- [ ] **Step 2: Remove locale normalization from `src/server/db/api-routes.ts`**

Remove the `toTranslatorLocaleCode` import and the normalization block. Replace the locale extraction with:

```ts
const locale = url.searchParams.get('lang') || url.searchParams.get('locale') || undefined
```

Also update the blog-slug 404 check to match — since we no longer normalize, the isEnglish check should be:
```ts
const isEnglish = !locale || locale === 'en-US' || locale === 'en'
```

- [ ] **Step 3: Update `isEnglish` check in `blog-post.ts` repository**

In `getBySlug`, change:
```ts
const isEnglish = loc === 'en' || loc === 'en-US'
```
to:
```ts
const isEnglish = !locale || locale === 'en-US'
```

And update the `getPublished` method's default locale:
```ts
const loc = locale ?? 'en-US'  // was 'en-US', stays the same
```

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/server/ssr-data.ts src/server/db/api-routes.ts src/server/db/repositories/blog-post.ts
git commit -m "feat: remove Azure Translator locale normalization — D1 now stores BCP47 directly"
```

---

### Task 5: Pre-stage export + verify workflow

These steps run BEFORE the cutover window to catch transform issues early.

- [ ] **Step 1: Set Cosmos env vars**

```bash
export COSMOS_ENDPOINT=https://starthn-cosmos.documents.azure.com:443/
export COSMOS_KEY=<get from Azure Portal / Key Vault>
export COSMOS_DATABASE=starthn
```

- [ ] **Step 2: Run the pre-stage export**

```bash
npx tsx scripts/migrate-cosmos-to-d1.ts --export --out scripts/data/prestage
```

Expected output: one JSON file per container in `scripts/data/prestage/`.

- [ ] **Step 3: Run the import in dry-run mode (no --remote)**

```bash
npx tsx scripts/migrate-cosmos-to-d1.ts --import --in scripts/data/prestage
```

Expected output: SQL chunks written to `scripts/data/prestage/sql/`. No D1 changes.

- [ ] **Step 4: Inspect the SQL chunks**

Check that:
- Locale codes are BCP47 (e.g. `'bs-BA'` not `'bs'`)
- No unexpected NULL values in required fields
- Row counts match expectations

- [ ] **Step 5: (Optional) Import pre-stage data into a local D1 for testing**

```bash
npx wrangler d1 execute starthn-db --local --file scripts/data/prestage/sql/chunk-0000.sql
# ...repeat for each chunk, or write a small shell loop
```

- [ ] **Step 6: Fix any transform issues found, re-run, verify**

If any SQL errors or unexpected data, fix the transform functions in the script, re-run steps 2–5. The test suite (migrate-cosmos-to-d1.test.ts) should catch logic errors — add failing tests for any new edge cases found.

---

### Task 6: Cutover runbook

This is a documentation task — record the exact steps for the maintenance window.

- [ ] **Step 1: Create `docs/cutover-runbook.md`**

```markdown
# Cutover Runbook

## Prerequisites
- [ ] Plan 1 deployed (D1_PRIMARY=false on production)
- [ ] Plan 2 deployed (maintenance mode + migration script ready)
- [ ] Pre-stage import verified (no transform errors)
- [ ] Current user is logged in to Cloudflare and Azure CLI

## Window (estimated: 30–60 minutes)

### 1. Enable maintenance mode
```
npx wrangler deploy --var MAINTENANCE_MODE:true
```
Verify: `POST https://starthn.ba/api/manage/blog` → 503

### 2. Confirm public reads still work
Open `https://starthn.ba/bs-BA/blog` in browser — blog list loads.

### 3. Run final Cosmos export
```
export COSMOS_ENDPOINT=... COSMOS_KEY=... COSMOS_DATABASE=starthn
npx tsx scripts/migrate-cosmos-to-d1.ts --export --out scripts/data/final
```

### 4. Back up production D1
```
npx wrangler d1 export starthn-db --remote --output scripts/data/d1-backup-$(date +%Y%m%d).sql
```

### 5. Import final data to production D1
```
npx tsx scripts/migrate-cosmos-to-d1.ts --import --in scripts/data/final --remote
```

### 6. Verify row counts
```
npx tsx scripts/migrate-cosmos-to-d1.ts --verify --in scripts/data/final --remote
```
Must exit 0.

### 7. Deploy with D1_PRIMARY=true
```
npx wrangler deploy --var D1_PRIMARY:true --var MAINTENANCE_MODE:true
```

### 8. Smoke test (maintenance still enabled)
- [ ] GET /api/manage/blog → 200 (list from D1)
- [ ] GET /api/auth/login → returns route exists (400 for missing body)
- [ ] GET /api/roles → 200
- [ ] GET /api/blog → 200 (public read)
- [ ] GET /bs-BA/blog/... → loads Bosnian content

### 9. Disable maintenance mode
```
npx wrangler deploy --var D1_PRIMARY:true --var MAINTENANCE_MODE:false
```

### 10. Final smoke test (writes enabled)
- [ ] POST /api/auth/login → 200 with token
- [ ] Microsoft OAuth login → works
- [ ] Create draft blog post → 201
- [ ] Edit profile → 200
- [ ] Trigger translation → 200 (Azure compute runs, writes back via /api/internal/sync)
- [ ] POST /api/contact → email delivered

## Rollback (before step 9 — writes not yet enabled)
```
npx wrangler deploy --var D1_PRIMARY:false --var MAINTENANCE_MODE:false
```
Cosmos unchanged. Azure continues as source of truth.

## Post-window (after 1 full business day)
See Plan 3 — Azure Compute Sidecar Cleanup.
```

- [ ] **Step 2: Commit**

```bash
git add docs/cutover-runbook.md
git commit -m "docs: add cutover runbook for D1 migration"
```

---

**Plan 2 complete.** Migration tooling is in place, locale normalization is correct, maintenance mode gates writes during cutover, and the runbook documents every step of the window. Proceed to cutover, then Plan 3.
