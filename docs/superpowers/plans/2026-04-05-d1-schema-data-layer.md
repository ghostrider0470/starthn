# D1 Schema + Data Access Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the Cloudflare D1 database, relational schema, TypeScript data access layer, and MongoDB migration script — the foundation for the full backend migration.

**Architecture:** SQLite database on Cloudflare D1 with typed repository classes accessed via the D1 binding in Workers. Schema normalizes MongoDB documents into 19 relational tables with per-entity translation tables. Migration script reads from MongoDB and inserts into D1.

**Tech Stack:** Cloudflare D1, Wrangler CLI, TypeScript, Vitest, MongoDB driver (migration only)

---

### File Map

```
src/server/
  db/
    schema.sql                    -- CREATE TABLE + INDEX statements (19 tables)
    client.ts                     -- D1 helper: generateId(), typed query wrappers
    repositories/
      blog-post.ts                -- BlogPostRepository
      category.ts                 -- CategoryRepository
      tag.ts                      -- TagRepository
      case-study.ts               -- CaseStudyRepository
      user.ts                     -- UserRepository
      role.ts                     -- RoleRepository
      api-key.ts                  -- ApiKeyRepository
      refresh-token.ts            -- RefreshTokenRepository
      llm-provider.ts             -- LlmProviderRepository
      llm-settings.ts             -- LlmSettingsRepository
    types/
      entities.ts                 -- Row types matching DB columns
      dtos.ts                     -- Request/response DTOs
scripts/
  migrate-mongo-to-d1.ts          -- One-time MongoDB → D1 migration
wrangler.jsonc                    -- Add d1_databases binding
```

---

### Task 1: Create D1 Database + Wrangler Binding

**Files:**
- Modify: `wrangler.jsonc`

- [ ] **Step 1: Create the D1 database**

Run:
```bash
npx wrangler d1 create horizon-db
```

Expected: prints `database_id` UUID. Copy it.

- [ ] **Step 2: Add D1 binding to wrangler.jsonc**

Add to `wrangler.jsonc` after the `vars` block:

```jsonc
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "horizon-db",
      "database_id": "<paste-id-from-step-1>"
    }
  ]
```

- [ ] **Step 3: Commit**

```bash
git add wrangler.jsonc
git commit -m "chore: add D1 database binding"
```

---

### Task 2: Write the SQL Schema

**Files:**
- Create: `src/server/db/schema.sql`

- [ ] **Step 1: Create schema file with all 19 tables and indexes**

Write the full schema from the spec to `src/server/db/schema.sql`. This is the complete content — all CREATE TABLE statements (users, blog_posts, categories, tags, case_studies, roles, llm_providers, llm_settings, api_keys, case_study_decisions, case_study_results, refresh_tokens, blog_post_translations, category_translations, tag_translations, case_study_translations, user_page_translations, blog_post_tags, user_roles) followed by all CREATE INDEX statements. Use the exact SQL from the design spec.

- [ ] **Step 2: Apply schema to local D1**

Run:
```bash
npx wrangler d1 execute horizon-db --local --file=src/server/db/schema.sql
```

Expected: no errors, tables created.

- [ ] **Step 3: Verify tables exist**

Run:
```bash
npx wrangler d1 execute horizon-db --local --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

Expected: 19 table names listed.

- [ ] **Step 4: Apply schema to remote D1**

Run:
```bash
npx wrangler d1 execute horizon-db --remote --file=src/server/db/schema.sql
```

- [ ] **Step 5: Commit**

```bash
git add src/server/db/schema.sql
git commit -m "feat: D1 schema — 19 tables, indexes"
```

---

### Task 3: TypeScript Entity Types

**Files:**
- Create: `src/server/db/types/entities.ts`

- [ ] **Step 1: Write entity types matching DB columns**

```typescript
// src/server/db/types/entities.ts

export interface UserRow {
  id: string
  email: string
  password_hash: string | null
  first_name: string
  last_name: string
  phone_number: string | null
  is_active: number // SQLite boolean
  is_opted_out: number
  email_notifications: number
  sms_notifications: number
  avatar_url: string | null
  bio: string | null
  profession: string | null
  expertise: string | null // JSON array
  social_linkedin: string | null
  social_twitter: string | null
  social_github: string | null
  social_website: string | null
  slug: string | null
  page_content: string | null // JSON array
  created_at: string
  updated_at: string
}

export interface BlogPostRow {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string // JSON array
  is_published: number
  is_featured: number
  published_at: string | null
  read_time: number | null
  category: string | null
  subcategory: string | null
  cover_image: string | null
  banner_image: string | null
  author_id: string | null
  author_name: string | null
  created_at: string
  updated_at: string
}

export interface CategoryRow {
  id: string
  slug: string
  label: string
  parent_id: string | null
  created_at: string
  updated_at: string
}

export interface TagRow {
  id: string
  slug: string
  label: string
  created_at: string
  updated_at: string
}

export interface CaseStudyRow {
  id: string
  slug: string
  title: string
  client: string | null
  industry: string | null
  description: string | null
  executive_summary: string | null
  challenge: string | null
  solution: string | null
  tech_stack: string | null // JSON array
  tags: string | null // JSON array
  is_published: number
  is_featured: number
  cover_image: string | null
  created_at: string
  updated_at: string
}

export interface RoleRow {
  id: string
  name: string
  slug: string
  description: string | null
  permissions: string // JSON array
  is_system: number
  created_at: string
  updated_at: string
}

export interface ApiKeyRow {
  id: string
  user_id: string
  name: string
  key_hash: string
  key_prefix: string
  key_suffix: string
  expires_at: string | null
  last_used_at: string | null
  created_at: string
}

export interface RefreshTokenRow {
  id: string
  user_id: string
  token_hash: string
  expires_at: string
  created_at: string
}

export interface CaseStudyDecisionRow {
  id: string
  case_study_id: string
  decision: string
  rationale: string
  sort_order: number
}

export interface CaseStudyResultRow {
  id: string
  case_study_id: string
  metric: string
  value: string
  description: string | null
  sort_order: number
}

export interface LlmProviderRow {
  id: string
  key: string
  name: string
  api: string
  base_url: string
  api_key: string
  headers: string // JSON object
  models: string // JSON array
  is_active: number
  created_at: string
  updated_at: string
}

export interface LlmSettingsRow {
  id: string
  chat_provider_key: string | null
  chat_model_id: string | null
  review_provider_key: string | null
  review_model_id: string | null
  translation_provider_key: string | null
  translation_model_id: string | null
  updated_at: string
}

// Translation rows
export interface BlogPostTranslationRow {
  id: string
  post_id: string
  locale: string
  title: string | null
  excerpt: string | null
  content: string | null // JSON array
  is_auto_translated: number
  translated_at: string
}

export interface CategoryTranslationRow {
  id: string
  category_id: string
  locale: string
  label: string
  is_auto_translated: number
  translated_at: string
}

export interface TagTranslationRow {
  id: string
  tag_id: string
  locale: string
  label: string
  is_auto_translated: number
  translated_at: string
}

export interface CaseStudyTranslationRow {
  id: string
  case_study_id: string
  locale: string
  title: string | null
  description: string | null
  challenge: string | null
  solution: string | null
  executive_summary: string | null
  is_auto_translated: number
  translated_at: string
}

export interface UserPageTranslationRow {
  id: string
  user_id: string
  locale: string
  bio: string | null
  page_content: string | null // JSON array
  is_auto_translated: number
  translated_at: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/db/types/entities.ts
git commit -m "feat: TypeScript entity types for D1 rows"
```

---

### Task 4: D1 Client Helper

**Files:**
- Create: `src/server/db/client.ts`
- Test: `src/server/db/client.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// src/server/db/client.test.ts
import { describe, it, expect } from 'vitest'
import { generateId, parseJson } from './client'

describe('generateId', () => {
  it('returns a 32-char hex string', () => {
    const id = generateId()
    expect(id).toMatch(/^[0-9a-f]{32}$/)
  })

  it('returns unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })
})

describe('parseJson', () => {
  it('parses valid JSON string', () => {
    expect(parseJson('["a","b"]', [])).toEqual(['a', 'b'])
  })

  it('returns fallback for null', () => {
    expect(parseJson(null, [])).toEqual([])
  })

  it('returns fallback for invalid JSON', () => {
    expect(parseJson('not json', {})).toEqual({})
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/db/client.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/server/db/client.ts
import { randomBytes } from 'node:crypto'

/** Generate a 32-char hex ID (same format as schema DEFAULT) */
export function generateId(): string {
  return randomBytes(16).toString('hex')
}

/** Safely parse a JSON column, returning fallback on null/invalid */
export function parseJson<T>(value: string | null, fallback: T): T {
  if (value === null) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

/** Get a D1Database instance from the Workers env binding */
export function getDb(env: { DB: D1Database }): D1Database {
  return env.DB
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/db/client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/db/client.ts src/server/db/client.test.ts
git commit -m "feat: D1 client helper — generateId, parseJson"
```

---

### Task 5: DTO Types

**Files:**
- Create: `src/server/db/types/dtos.ts`

- [ ] **Step 1: Write response DTOs matching the current .NET API responses**

```typescript
// src/server/db/types/dtos.ts

export interface BlogPostDto {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string[]
  isPublished: boolean
  isFeatured: boolean
  publishedAt: string | null
  readTime: number | null
  category: string | null
  subcategory: string | null
  coverImage: string | null
  bannerImage: string | null
  authorId: string | null
  authorName: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface CategoryDto {
  id: string
  slug: string
  label: string
  parentId: string | null
  translations: Record<string, string>
}

export interface TagDto {
  id: string
  slug: string
  label: string
  translations: Record<string, string>
}

export interface CaseStudyDto {
  id: string
  slug: string
  title: string
  client: string | null
  industry: string | null
  description: string | null
  executiveSummary: string | null
  challenge: string | null
  solution: string | null
  techStack: string[]
  tags: string[]
  architectureDecisions: { decision: string; rationale: string }[]
  results: { metric: string; value: string; description: string | null }[]
  isPublished: boolean
  isFeatured: boolean
  coverImage: string | null
  createdAt: string
  updatedAt: string
}

export interface UserDto {
  id: string
  email: string
  firstName: string
  lastName: string
  phoneNumber: string | null
  isActive: boolean
  avatarUrl: string | null
  bio: string | null
  profession: string | null
  expertise: string[]
  socialLinks: {
    linkedin: string | null
    twitter: string | null
    github: string | null
    website: string | null
  }
  slug: string | null
  roles: string[]
  createdAt: string
  updatedAt: string
}

export interface AuthorDto {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  bio: string | null
  profession: string | null
  slug: string | null
  socialLinks: {
    linkedin: string | null
    twitter: string | null
    github: string | null
    website: string | null
  }
  postCount: number
}

export interface RoleDto {
  id: string
  name: string
  slug: string
  description: string | null
  permissions: string[]
  isSystem: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/db/types/dtos.ts
git commit -m "feat: DTO types for API responses"
```

---

### Task 6: BlogPostRepository

**Files:**
- Create: `src/server/db/repositories/blog-post.ts`
- Test: `src/server/db/repositories/blog-post.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// src/server/db/repositories/blog-post.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { BlogPostRepository } from './blog-post'
import { generateId } from '../client'

// Mock D1Database for unit tests
function createMockDb(rows: any[] = [], total = 0) {
  const stmt = {
    bind: (..._args: any[]) => stmt,
    all: async () => ({ results: rows }),
    first: async () => rows[0] ?? null,
    run: async () => ({ success: true }),
  }
  return { prepare: () => stmt } as unknown as D1Database
}

describe('BlogPostRepository', () => {
  it('getPublished returns paginated posts', async () => {
    const row = {
      id: generateId(), slug: 'test-post', title: 'Test', excerpt: 'Excerpt',
      content: '["Hello"]', is_published: 1, is_featured: 0, published_at: '2026-01-01',
      read_time: 5, category: 'tech', subcategory: null, cover_image: null,
      banner_image: null, author_id: null, author_name: 'Author',
      created_at: '2026-01-01', updated_at: '2026-01-01',
      t_title: null, t_excerpt: null, t_content: null, tag_slugs: 'react,node',
    }
    const repo = new BlogPostRepository(createMockDb([row]))
    const result = await repo.getPublished()
    expect(result.length).toBe(1)
    expect(result[0].slug).toBe('test-post')
    expect(result[0].content).toEqual(['Hello'])
    expect(result[0].tags).toEqual(['react', 'node'])
  })

  it('getBySlug returns null for missing post', async () => {
    const repo = new BlogPostRepository(createMockDb([]))
    const result = await repo.getBySlug('nonexistent')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/db/repositories/blog-post.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```typescript
// src/server/db/repositories/blog-post.ts
import { parseJson } from '../client'
import type { BlogPostRow } from '../types/entities'
import type { BlogPostDto } from '../types/dtos'

function toDto(row: BlogPostRow & { t_title?: string; t_excerpt?: string; t_content?: string; tag_slugs?: string }): BlogPostDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.t_title ?? row.title,
    excerpt: row.t_excerpt ?? row.excerpt,
    content: parseJson<string[]>(row.t_content ?? row.content, []),
    isPublished: row.is_published === 1,
    isFeatured: row.is_featured === 1,
    publishedAt: row.published_at,
    readTime: row.read_time,
    category: row.category,
    subcategory: row.subcategory,
    coverImage: row.cover_image,
    bannerImage: row.banner_image,
    authorId: row.author_id,
    authorName: row.author_name,
    tags: row.tag_slugs ? row.tag_slugs.split(',') : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class BlogPostRepository {
  constructor(private db: D1Database) {}

  async getPublished(locale?: string, page = 1, pageSize = 10): Promise<BlogPostDto[]> {
    const offset = (page - 1) * pageSize
    const loc = locale ?? 'en-US'
    const { results } = await this.db.prepare(`
      SELECT p.*,
        tr.title AS t_title, tr.excerpt AS t_excerpt, tr.content AS t_content,
        GROUP_CONCAT(t.slug) AS tag_slugs
      FROM blog_posts p
      LEFT JOIN blog_post_translations tr ON tr.post_id = p.id AND tr.locale = ?
      LEFT JOIN blog_post_tags bt ON bt.post_id = p.id
      LEFT JOIN tags t ON t.id = bt.tag_id
      WHERE p.is_published = 1
      GROUP BY p.id
      ORDER BY p.published_at DESC
      LIMIT ? OFFSET ?
    `).bind(loc, pageSize, offset).all()
    return results.map(r => toDto(r as any))
  }

  async getBySlug(slug: string, locale?: string): Promise<BlogPostDto | null> {
    const loc = locale ?? 'en-US'
    const row = await this.db.prepare(`
      SELECT p.*,
        tr.title AS t_title, tr.excerpt AS t_excerpt, tr.content AS t_content,
        GROUP_CONCAT(t.slug) AS tag_slugs
      FROM blog_posts p
      LEFT JOIN blog_post_translations tr ON tr.post_id = p.id AND tr.locale = ?
      LEFT JOIN blog_post_tags bt ON bt.post_id = p.id
      LEFT JOIN tags t ON t.id = bt.tag_id
      WHERE p.slug = ?
      GROUP BY p.id
    `).bind(loc, slug).first()
    return row ? toDto(row as any) : null
  }

  async getAll(): Promise<BlogPostDto[]> {
    const { results } = await this.db.prepare(`
      SELECT p.*, GROUP_CONCAT(t.slug) AS tag_slugs
      FROM blog_posts p
      LEFT JOIN blog_post_tags bt ON bt.post_id = p.id
      LEFT JOIN tags t ON t.id = bt.tag_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all()
    return results.map(r => toDto(r as any))
  }

  async getCount(): Promise<number> {
    const row = await this.db.prepare('SELECT COUNT(*) as count FROM blog_posts').first<{ count: number }>()
    return row?.count ?? 0
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/db/repositories/blog-post.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/db/repositories/blog-post.ts src/server/db/repositories/blog-post.test.ts
git commit -m "feat: BlogPostRepository with published/slug queries"
```

---

### Task 7: CategoryRepository + TagRepository

**Files:**
- Create: `src/server/db/repositories/category.ts`
- Create: `src/server/db/repositories/tag.ts`

- [ ] **Step 1: Write CategoryRepository**

```typescript
// src/server/db/repositories/category.ts
import { parseJson } from '../client'
import type { CategoryDto } from '../types/dtos'

export class CategoryRepository {
  constructor(private db: D1Database) {}

  async getAll(locale?: string): Promise<CategoryDto[]> {
    const { results: categories } = await this.db.prepare(
      'SELECT * FROM categories ORDER BY label'
    ).all()

    const { results: translations } = await this.db.prepare(
      'SELECT * FROM category_translations'
    ).all()

    const transMap = new Map<string, Record<string, string>>()
    for (const t of translations as any[]) {
      if (!transMap.has(t.category_id)) transMap.set(t.category_id, {})
      transMap.get(t.category_id)![t.locale] = t.label
    }

    return (categories as any[]).map(c => {
      const trans = transMap.get(c.id) ?? {}
      return {
        id: c.id,
        slug: c.slug,
        label: (locale && trans[locale]) ? trans[locale] : c.label,
        parentId: c.parent_id,
        translations: trans,
      }
    })
  }
}
```

- [ ] **Step 2: Write TagRepository**

```typescript
// src/server/db/repositories/tag.ts
import type { TagDto } from '../types/dtos'

export class TagRepository {
  constructor(private db: D1Database) {}

  async getAll(locale?: string): Promise<TagDto[]> {
    const { results: tags } = await this.db.prepare(
      'SELECT * FROM tags ORDER BY label'
    ).all()

    const { results: translations } = await this.db.prepare(
      'SELECT * FROM tag_translations'
    ).all()

    const transMap = new Map<string, Record<string, string>>()
    for (const t of translations as any[]) {
      if (!transMap.has(t.tag_id)) transMap.set(t.tag_id, {})
      transMap.get(t.tag_id)![t.locale] = t.label
    }

    return (tags as any[]).map(tag => {
      const trans = transMap.get(tag.id) ?? {}
      return {
        id: tag.id,
        slug: tag.slug,
        label: (locale && trans[locale]) ? trans[locale] : tag.label,
        translations: trans,
      }
    })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/server/db/repositories/category.ts src/server/db/repositories/tag.ts
git commit -m "feat: CategoryRepository + TagRepository with translations"
```

---

### Task 8: CaseStudyRepository

**Files:**
- Create: `src/server/db/repositories/case-study.ts`

- [ ] **Step 1: Write implementation**

```typescript
// src/server/db/repositories/case-study.ts
import { parseJson } from '../client'
import type { CaseStudyDto } from '../types/dtos'

export class CaseStudyRepository {
  constructor(private db: D1Database) {}

  async getPublished(locale?: string): Promise<CaseStudyDto[]> {
    const { results } = await this.db.prepare(
      'SELECT * FROM case_studies WHERE is_published = 1 ORDER BY created_at DESC'
    ).all()

    return Promise.all((results as any[]).map(r => this.hydrate(r, locale)))
  }

  async getBySlug(slug: string, locale?: string): Promise<CaseStudyDto | null> {
    const row = await this.db.prepare(
      'SELECT * FROM case_studies WHERE slug = ?'
    ).bind(slug).first()
    return row ? this.hydrate(row as any, locale) : null
  }

  async getAll(): Promise<CaseStudyDto[]> {
    const { results } = await this.db.prepare(
      'SELECT * FROM case_studies ORDER BY created_at DESC'
    ).all()
    return Promise.all((results as any[]).map(r => this.hydrate(r)))
  }

  private async hydrate(row: any, locale?: string): Promise<CaseStudyDto> {
    const [decisions, studyResults, translation] = await Promise.all([
      this.db.prepare(
        'SELECT decision, rationale FROM case_study_decisions WHERE case_study_id = ? ORDER BY sort_order'
      ).bind(row.id).all(),
      this.db.prepare(
        'SELECT metric, value, description FROM case_study_results WHERE case_study_id = ? ORDER BY sort_order'
      ).bind(row.id).all(),
      locale
        ? this.db.prepare(
            'SELECT * FROM case_study_translations WHERE case_study_id = ? AND locale = ?'
          ).bind(row.id, locale).first()
        : null,
    ])

    const t = translation as any

    return {
      id: row.id,
      slug: row.slug,
      title: t?.title ?? row.title,
      client: row.client,
      industry: row.industry,
      description: t?.description ?? row.description,
      executiveSummary: t?.executive_summary ?? row.executive_summary,
      challenge: t?.challenge ?? row.challenge,
      solution: t?.solution ?? row.solution,
      techStack: parseJson(row.tech_stack, []),
      tags: parseJson(row.tags, []),
      architectureDecisions: (decisions.results as any[]).map(d => ({
        decision: d.decision,
        rationale: d.rationale,
      })),
      results: (studyResults.results as any[]).map(r => ({
        metric: r.metric,
        value: r.value,
        description: r.description,
      })),
      isPublished: row.is_published === 1,
      isFeatured: row.is_featured === 1,
      coverImage: row.cover_image,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/db/repositories/case-study.ts
git commit -m "feat: CaseStudyRepository with decisions, results, translations"
```

---

### Task 9: UserRepository + RoleRepository

**Files:**
- Create: `src/server/db/repositories/user.ts`
- Create: `src/server/db/repositories/role.ts`

- [ ] **Step 1: Write UserRepository**

```typescript
// src/server/db/repositories/user.ts
import { parseJson } from '../client'
import type { UserDto, AuthorDto } from '../types/dtos'

export class UserRepository {
  constructor(private db: D1Database) {}

  async getById(id: string): Promise<UserDto | null> {
    const row = await this.db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
    if (!row) return null
    return this.toDto(row as any, await this.getUserRoles(id))
  }

  async getByEmail(email: string): Promise<(UserDto & { passwordHash: string | null }) | null> {
    const row = await this.db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first() as any
    if (!row) return null
    const roles = await this.getUserRoles(row.id)
    return { ...this.toDto(row, roles), passwordHash: row.password_hash }
  }

  async getBySlug(slug: string): Promise<UserDto | null> {
    const row = await this.db.prepare('SELECT * FROM users WHERE slug = ?').bind(slug).first()
    if (!row) return null
    return this.toDto(row as any, await this.getUserRoles((row as any).id))
  }

  async getAuthors(): Promise<AuthorDto[]> {
    const { results } = await this.db.prepare(`
      SELECT u.*, COUNT(bp.id) as post_count
      FROM users u
      LEFT JOIN blog_posts bp ON bp.author_id = u.id AND bp.is_published = 1
      WHERE u.is_active = 1 AND u.slug IS NOT NULL
      GROUP BY u.id
      ORDER BY u.first_name
    `).all()
    return (results as any[]).map(r => ({
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      avatarUrl: r.avatar_url,
      bio: r.bio,
      profession: r.profession,
      slug: r.slug,
      socialLinks: {
        linkedin: r.social_linkedin,
        twitter: r.social_twitter,
        github: r.social_github,
        website: r.social_website,
      },
      postCount: r.post_count ?? 0,
    }))
  }

  private async getUserRoles(userId: string): Promise<string[]> {
    const { results } = await this.db.prepare(`
      SELECT r.name FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `).bind(userId).all()
    return (results as any[]).map(r => r.name)
  }

  private toDto(row: any, roles: string[]): UserDto {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      phoneNumber: row.phone_number,
      isActive: row.is_active === 1,
      avatarUrl: row.avatar_url,
      bio: row.bio,
      profession: row.profession,
      expertise: parseJson(row.expertise, []),
      socialLinks: {
        linkedin: row.social_linkedin,
        twitter: row.social_twitter,
        github: row.social_github,
        website: row.social_website,
      },
      slug: row.slug,
      roles,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}
```

- [ ] **Step 2: Write RoleRepository**

```typescript
// src/server/db/repositories/role.ts
import { parseJson } from '../client'
import type { RoleDto } from '../types/dtos'

export class RoleRepository {
  constructor(private db: D1Database) {}

  async getAll(): Promise<RoleDto[]> {
    const { results } = await this.db.prepare('SELECT * FROM roles ORDER BY name').all()
    return (results as any[]).map(r => this.toDto(r))
  }

  async getPublic(): Promise<RoleDto[]> {
    const { results } = await this.db.prepare(
      "SELECT * FROM roles WHERE name NOT IN ('superadmin') ORDER BY name"
    ).all()
    return (results as any[]).map(r => this.toDto(r))
  }

  async getById(id: string): Promise<RoleDto | null> {
    const row = await this.db.prepare('SELECT * FROM roles WHERE id = ?').bind(id).first()
    return row ? this.toDto(row as any) : null
  }

  private toDto(row: any): RoleDto {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      permissions: parseJson(row.permissions, []),
      isSystem: row.is_system === 1,
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/server/db/repositories/user.ts src/server/db/repositories/role.ts
git commit -m "feat: UserRepository + RoleRepository"
```

---

### Task 10: Remaining Repositories (ApiKey, RefreshToken, LLM)

**Files:**
- Create: `src/server/db/repositories/api-key.ts`
- Create: `src/server/db/repositories/refresh-token.ts`
- Create: `src/server/db/repositories/llm-provider.ts`
- Create: `src/server/db/repositories/llm-settings.ts`

- [ ] **Step 1: Write ApiKeyRepository**

```typescript
// src/server/db/repositories/api-key.ts
import { generateId } from '../client'

export class ApiKeyRepository {
  constructor(private db: D1Database) {}

  async create(userId: string, name: string, keyHash: string, keyPrefix: string, keySuffix: string, expiresAt?: string) {
    const id = generateId()
    await this.db.prepare(`
      INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, key_suffix, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, userId, name, keyHash, keyPrefix, keySuffix, expiresAt ?? null).run()
    return id
  }

  async listByUser(userId: string) {
    const { results } = await this.db.prepare(
      'SELECT id, name, key_prefix, key_suffix, expires_at, last_used_at, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all()
    return results
  }

  async findByHash(keyHash: string) {
    return this.db.prepare('SELECT * FROM api_keys WHERE key_hash = ?').bind(keyHash).first()
  }

  async delete(userId: string, keyId: string) {
    await this.db.prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?').bind(keyId, userId).run()
  }

  async updateLastUsed(id: string) {
    await this.db.prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?").bind(id).run()
  }
}
```

- [ ] **Step 2: Write RefreshTokenRepository**

```typescript
// src/server/db/repositories/refresh-token.ts
import { generateId } from '../client'

export class RefreshTokenRepository {
  constructor(private db: D1Database) {}

  async create(userId: string, tokenHash: string, expiresAt: string) {
    const id = generateId()
    await this.db.prepare(`
      INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `).bind(id, userId, tokenHash, expiresAt).run()
    return id
  }

  async findByHash(tokenHash: string) {
    return this.db.prepare(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > datetime(\'now\')'
    ).bind(tokenHash).first()
  }

  async deleteByUser(userId: string) {
    await this.db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').bind(userId).run()
  }

  async deleteExpired() {
    await this.db.prepare("DELETE FROM refresh_tokens WHERE expires_at <= datetime('now')").run()
  }
}
```

- [ ] **Step 3: Write LlmProviderRepository**

```typescript
// src/server/db/repositories/llm-provider.ts
import { parseJson } from '../client'

export class LlmProviderRepository {
  constructor(private db: D1Database) {}

  async getAll() {
    const { results } = await this.db.prepare('SELECT * FROM llm_providers ORDER BY name').all()
    return (results as any[]).map(r => ({
      ...r,
      headers: parseJson(r.headers, {}),
      models: parseJson(r.models, []),
      isActive: r.is_active === 1,
    }))
  }

  async getByKey(key: string) {
    const row = await this.db.prepare('SELECT * FROM llm_providers WHERE key = ?').bind(key).first() as any
    if (!row) return null
    return { ...row, headers: parseJson(row.headers, {}), models: parseJson(row.models, []), isActive: row.is_active === 1 }
  }

  async getActiveForChat() {
    // Join with llm_settings to get the configured chat provider + model
    const settings = await this.db.prepare('SELECT * FROM llm_settings WHERE id = ?').bind('global').first() as any
    if (!settings?.chat_provider_key) return null
    const provider = await this.getByKey(settings.chat_provider_key)
    if (!provider) return null
    const model = provider.models.find((m: any) => m.id === settings.chat_model_id)
    return { provider, model }
  }
}
```

- [ ] **Step 4: Write LlmSettingsRepository**

```typescript
// src/server/db/repositories/llm-settings.ts

export class LlmSettingsRepository {
  constructor(private db: D1Database) {}

  async get() {
    return this.db.prepare('SELECT * FROM llm_settings WHERE id = ?').bind('global').first()
  }

  async upsert(settings: {
    chatProviderKey?: string; chatModelId?: string;
    reviewProviderKey?: string; reviewModelId?: string;
    translationProviderKey?: string; translationModelId?: string;
  }) {
    await this.db.prepare(`
      INSERT INTO llm_settings (id, chat_provider_key, chat_model_id, review_provider_key, review_model_id, translation_provider_key, translation_model_id, updated_at)
      VALUES ('global', ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        chat_provider_key = excluded.chat_provider_key,
        chat_model_id = excluded.chat_model_id,
        review_provider_key = excluded.review_provider_key,
        review_model_id = excluded.review_model_id,
        translation_provider_key = excluded.translation_provider_key,
        translation_model_id = excluded.translation_model_id,
        updated_at = datetime('now')
    `).bind(
      settings.chatProviderKey ?? null, settings.chatModelId ?? null,
      settings.reviewProviderKey ?? null, settings.reviewModelId ?? null,
      settings.translationProviderKey ?? null, settings.translationModelId ?? null,
    ).run()
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/server/db/repositories/api-key.ts src/server/db/repositories/refresh-token.ts src/server/db/repositories/llm-provider.ts src/server/db/repositories/llm-settings.ts
git commit -m "feat: ApiKey, RefreshToken, LlmProvider, LlmSettings repositories"
```

---

### Task 11: MongoDB → D1 Migration Script

**Files:**
- Create: `scripts/migrate-mongo-to-d1.ts`

- [ ] **Step 1: Install MongoDB driver (dev dependency)**

```bash
npm install -D mongodb
```

- [ ] **Step 2: Write the migration script**

The script connects to MongoDB, reads each collection, transforms documents to relational rows, and outputs SQL INSERT statements to a file. Then executes via `wrangler d1 execute`.

Create `scripts/migrate-mongo-to-d1.ts` with the following structure:
- Read `MONGODB_CONNECTION_STRING` and `MONGODB_DATABASE_NAME` from env
- For each collection (users, blogPosts, categories, tags, caseStudies, roles, llmProviders, llmSettings):
  - Fetch all documents
  - Transform: flatten embeds, extract translations into separate inserts, normalize joins
  - MongoDB ObjectId `.toHexString()` → TEXT id
  - Escape single quotes in string values
  - Write INSERT statements to `scripts/migration-output.sql`
- Handle: user.apiKeys → api_keys rows, user.roles → user_roles rows, blogPost.tags → blog_post_tags rows, blogPost.translations → blog_post_translations rows, caseStudy.architectureDecisions → case_study_decisions rows, caseStudy.results → case_study_results rows

- [ ] **Step 3: Test locally with dry run**

```bash
MONGODB_CONNECTION_STRING="mongodb://localhost:27017" MONGODB_DATABASE_NAME="horizon" npx tsx scripts/migrate-mongo-to-d1.ts --dry-run
```

Expected: prints SQL to stdout without executing.

- [ ] **Step 4: Execute migration against remote D1**

```bash
npx wrangler d1 execute horizon-db --remote --file=scripts/migration-output.sql
```

- [ ] **Step 5: Verify data**

```bash
npx wrangler d1 execute horizon-db --remote --command="SELECT COUNT(*) FROM users"
npx wrangler d1 execute horizon-db --remote --command="SELECT COUNT(*) FROM blog_posts"
npx wrangler d1 execute horizon-db --remote --command="SELECT COUNT(*) FROM categories"
```

- [ ] **Step 6: Commit**

```bash
git add scripts/migrate-mongo-to-d1.ts
git commit -m "feat: MongoDB → D1 migration script"
```

---

### Task 12: Barrel Export + Build Verification

**Files:**
- Create: `src/server/db/index.ts`

- [ ] **Step 1: Create barrel export**

```typescript
// src/server/db/index.ts
export { generateId, parseJson, getDb } from './client'
export { BlogPostRepository } from './repositories/blog-post'
export { CategoryRepository } from './repositories/category'
export { TagRepository } from './repositories/tag'
export { CaseStudyRepository } from './repositories/case-study'
export { UserRepository } from './repositories/user'
export { RoleRepository } from './repositories/role'
export { ApiKeyRepository } from './repositories/api-key'
export { RefreshTokenRepository } from './repositories/refresh-token'
export { LlmProviderRepository } from './repositories/llm-provider'
export { LlmSettingsRepository } from './repositories/llm-settings'
export type * from './types/entities'
export type * from './types/dtos'
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: all pass

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/server/db/index.ts
git commit -m "feat: D1 data layer complete — barrel export, build verified"
```

---
