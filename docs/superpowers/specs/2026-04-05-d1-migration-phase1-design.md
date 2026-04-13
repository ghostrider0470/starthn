# Phase 1: D1 Schema + Data Access Layer

## Overview

Migrate from MongoDB (document model) to Cloudflare D1 (SQLite). This phase creates the relational schema, TypeScript data access layer, and a one-time data migration script. No API endpoints — just the foundation.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Translation strategy | Per-entity tables | Type-safe columns, clean joins, easy schema evolution |
| Auth approach | JWT + refresh tokens | Portable, existing flow works, Web Crypto API for signing |
| File storage | Cloudflare R2 | Zero egress, edge-served, same platform |
| Email | Microsoft Graph API (REST) | Keep existing auth flow, just port HTTP calls |
| Migration strategy | Gradual cutover (Phase A) | Migrate one API group at a time, Azure as fallback |

## Database Schema (19 tables)

### Core Entities

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  phone_number TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_opted_out INTEGER NOT NULL DEFAULT 0,
  email_notifications INTEGER NOT NULL DEFAULT 1,
  sms_notifications INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  bio TEXT,
  profession TEXT,
  expertise TEXT,  -- JSON array
  social_linkedin TEXT,
  social_twitter TEXT,
  social_github TEXT,
  social_website TEXT,
  slug TEXT UNIQUE,
  page_content TEXT,  -- JSON array (same as blog content blocks)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE blog_posts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,  -- JSON array of content blocks
  is_published INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  read_time INTEGER,
  category TEXT,
  subcategory TEXT,
  cover_image TEXT,
  banner_image TEXT,
  author_id TEXT REFERENCES users(id),
  author_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tags (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE case_studies (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  client TEXT,
  industry TEXT,
  description TEXT,
  executive_summary TEXT,
  challenge TEXT,
  solution TEXT,
  tech_stack TEXT,  -- JSON array
  tags TEXT,  -- JSON array
  is_published INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  cover_image TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE roles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT NOT NULL DEFAULT '[]',  -- JSON array
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE llm_providers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  api TEXT NOT NULL DEFAULT 'openai',
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  headers TEXT NOT NULL DEFAULT '{}',  -- JSON object
  models TEXT NOT NULL DEFAULT '[]',  -- JSON array
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE llm_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  chat_provider_key TEXT,
  chat_model_id TEXT,
  review_provider_key TEXT,
  review_model_id TEXT,
  translation_provider_key TEXT,
  translation_model_id TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Normalized Embedded Objects

```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_suffix TEXT NOT NULL,
  expires_at TEXT,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE case_study_decisions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  case_study_id TEXT NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  rationale TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE case_study_results (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  case_study_id TEXT NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Translation Tables

```sql
CREATE TABLE blog_post_translations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  post_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  title TEXT,
  excerpt TEXT,
  content TEXT,  -- JSON array
  is_auto_translated INTEGER NOT NULL DEFAULT 0,
  translated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(post_id, locale)
);

CREATE TABLE category_translations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  label TEXT NOT NULL,
  is_auto_translated INTEGER NOT NULL DEFAULT 0,
  translated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(category_id, locale)
);

CREATE TABLE tag_translations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  label TEXT NOT NULL,
  is_auto_translated INTEGER NOT NULL DEFAULT 0,
  translated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tag_id, locale)
);

CREATE TABLE case_study_translations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  case_study_id TEXT NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  title TEXT,
  description TEXT,
  challenge TEXT,
  solution TEXT,
  executive_summary TEXT,
  is_auto_translated INTEGER NOT NULL DEFAULT 0,
  translated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(case_study_id, locale)
);

CREATE TABLE user_page_translations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  bio TEXT,
  page_content TEXT,  -- JSON array
  is_auto_translated INTEGER NOT NULL DEFAULT 0,
  translated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, locale)
);
```

### Join Tables

```sql
CREATE TABLE blog_post_tags (
  post_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);
```

### Indexes

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_slug ON users(slug);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_published ON blog_posts(is_published, published_at DESC);
CREATE INDEX idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_category ON blog_posts(category);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_case_studies_slug ON case_studies(slug);
CREATE INDEX idx_case_studies_published ON case_studies(is_published);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_blog_post_translations_lookup ON blog_post_translations(post_id, locale);
CREATE INDEX idx_category_translations_lookup ON category_translations(category_id, locale);
CREATE INDEX idx_tag_translations_lookup ON tag_translations(tag_id, locale);
CREATE INDEX idx_case_study_translations_lookup ON case_study_translations(case_study_id, locale);
CREATE INDEX idx_user_page_translations_lookup ON user_page_translations(user_id, locale);
CREATE INDEX idx_case_study_decisions_study ON case_study_decisions(case_study_id);
CREATE INDEX idx_case_study_results_study ON case_study_results(case_study_id);
```

## Data Access Layer

### File Structure

```
src/server/
  db/
    schema.sql          -- All CREATE TABLE + INDEX statements
    client.ts           -- D1 binding helper, typed query wrapper
    repositories/
      user.ts           -- UserRepository
      blog-post.ts      -- BlogPostRepository
      category.ts       -- CategoryRepository
      tag.ts            -- TagRepository
      case-study.ts     -- CaseStudyRepository
      role.ts           -- RoleRepository
      api-key.ts        -- ApiKeyRepository
      refresh-token.ts  -- RefreshTokenRepository
      llm-provider.ts   -- LlmProviderRepository
      llm-settings.ts   -- LlmSettingsRepository
    types/
      entities.ts       -- TypeScript types matching DB rows
      dtos.ts           -- Response/request DTOs
```

### Repository Pattern

Each repository class:
- Receives `D1Database` binding via constructor
- Uses prepared statements with parameterized queries (no string interpolation)
- Returns typed DTOs (not raw rows)
- Handles JSON column serialization/deserialization

Example pattern:
```typescript
export class BlogPostRepository {
  constructor(private db: D1Database) {}

  async getPublished(locale?: string, page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize
    const stmt = this.db.prepare(`
      SELECT p.*, t.title as t_title, t.excerpt as t_excerpt
      FROM blog_posts p
      LEFT JOIN blog_post_translations t ON t.post_id = p.id AND t.locale = ?
      WHERE p.is_published = 1
      ORDER BY p.published_at DESC
      LIMIT ? OFFSET ?
    `)
    return stmt.bind(locale ?? 'en-US', pageSize, offset).all()
  }
}
```

## Data Migration Script

`scripts/migrate-mongo-to-d1.ts` — one-time TypeScript script:

1. Connect to MongoDB via `mongodb` driver (read-only)
2. For each collection:
   - Read all documents
   - Transform to relational rows (flatten embeds, extract translations, normalize joins)
   - Generate SQL INSERT statements
3. Execute against D1 via `wrangler d1 execute`

Handles:
- MongoDB ObjectId → hex string ID mapping
- Embedded arrays → separate table rows with foreign keys
- Translation dictionaries → per-entity translation table rows
- Nested objects (social links) → flat columns

## Wrangler Configuration

Add D1 binding to `wrangler.jsonc`:
```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "horizon-db",
      "database_id": "<created-by-wrangler>"
    }
  ]
}
```

## What This Phase Does NOT Include

- API route handlers (Phase 2)
- Auth middleware (Phase 3)
- Admin endpoints (Phase 4)
- Chat/Contact handlers (Phase 5)
- R2 file upload (Phase 6)

This phase is the data foundation. Phase 2 builds public read APIs on top of it.
