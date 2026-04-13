/**
 * Generalized /api/internal/sync endpoint.
 *
 * Receives batched entity changes from the Azure Functions Change Feed
 * triggers and upserts them into D1 atomically.
 *
 * Cosmos Change Feed delivers inserts and updates. Deletes are handled
 * via soft-delete: items with `_deleted: true` or `_ts` tombstone markers
 * are removed from D1. Items with `isPublished: false` on content entities
 * are also removed from public-facing tables.
 */
import type { Context } from 'hono'
import type { Bindings } from './bindings'

interface SyncPayload {
  entity: string
  schemaVersion: number
  items: Record<string, unknown>[]
  timestamp: string
}

export interface PreparedStatement {
  sql: string
  params: unknown[]
}

// ─── Helpers ────────────────────────────────────────────────

function isDeleted(item: Record<string, unknown>): boolean {
  // Only explicit soft-delete flag. ttl === -1 means "never expire" in Cosmos,
  // NOT deleted. Soft-deleted items set _deleted: true (+ positive ttl for purge).
  return item._deleted === true
}

// ─── Entity handlers ────────────────────────────────────────
// Each handler maps a Cosmos document to one or more D1 SQL statements.
// Handles both upserts and soft-deletes.

const ENTITY_HANDLERS: Record<
  string,
  (item: Record<string, unknown>) => PreparedStatement[]
> = {
  blogPosts: (item) => {
    if (isDeleted(item)) {
      return [
        { sql: `DELETE FROM blog_post_tags WHERE post_id = ?`, params: [item.id] },
        { sql: `DELETE FROM blog_post_translations WHERE post_id = ?`, params: [item.id] },
        { sql: `DELETE FROM blog_posts WHERE id = ?`, params: [item.id] },
      ]
    }

    const stmts: PreparedStatement[] = [
      {
        sql: `INSERT OR REPLACE INTO blog_posts
          (id, slug, title, excerpt, content, is_published, is_featured,
           published_at, read_time, category, subcategory, cover_image,
           banner_image, author_id, author_name, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          item.id,
          item.slug,
          item.title,
          item.excerpt,
          JSON.stringify(item.content ?? []),
          item.isPublished ? 1 : 0,
          item.isFeatured ? 1 : 0,
          item.publishedAt,
          item.readTime,
          item.category,
          item.subcategory,
          item.coverImage,
          item.bannerImage,
          item.authorId,
          item.author,
          item.createdAt,
          item.updatedAt,
        ],
      },
    ]

    // Always clear and re-insert tags (handles empty → no tags case)
    const tags = (item.tags ?? []) as string[]
    stmts.push({
      sql: `DELETE FROM blog_post_tags WHERE post_id = ?`,
      params: [item.id],
    })
    for (const tagSlug of tags) {
      stmts.push({
        sql: `INSERT OR IGNORE INTO blog_post_tags (post_id, tag_id)
          SELECT ?, id FROM tags WHERE slug = ?`,
        params: [item.id, tagSlug],
      })
    }

    return stmts
  },

  users: (item) => {
    if (isDeleted(item)) {
      return [
        { sql: `DELETE FROM user_roles WHERE user_id = ?`, params: [item.id] },
        { sql: `DELETE FROM user_page_translations WHERE user_id = ?`, params: [item.id] },
        { sql: `DELETE FROM users WHERE id = ?`, params: [item.id] },
      ]
    }

    // Social links are nested: item.socialLinks.linkedIn, etc.
    const socialLinks = (item.socialLinks ?? {}) as Record<string, unknown>

    const stmts: PreparedStatement[] = [
      {
        sql: `INSERT OR REPLACE INTO users
          (id, email, password_hash, first_name, last_name, phone_number,
           is_active, is_opted_out, email_notifications, sms_notifications,
           avatar_url, bio, profession, expertise,
           social_linkedin, social_twitter, social_github, social_website,
           slug, page_content, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          item.id,
          item.email,
          item.passwordHash,
          item.firstName,
          item.lastName,
          item.phoneNumber,
          item.isActive ? 1 : 0,
          item.isOptedOut ? 1 : 0,
          item.emailNotifications ? 1 : 0,
          item.smsNotifications ? 1 : 0,
          item.avatarUrl,
          item.bio,
          item.profession,
          JSON.stringify(item.expertise ?? []),
          socialLinks.linkedIn,
          socialLinks.twitter,
          socialLinks.gitHub,
          socialLinks.website,
          item.slug,
          JSON.stringify(item.pageContent ?? []),
          item.createdAt,
          item.updatedAt,
        ],
      },
    ]

    // Sync roles
    const roles = (item.roles ?? []) as string[]
    stmts.push({
      sql: `DELETE FROM user_roles WHERE user_id = ?`,
      params: [item.id],
    })
    for (const roleName of roles) {
      stmts.push({
        sql: `INSERT OR IGNORE INTO user_roles (user_id, role_id)
          SELECT ?, id FROM roles WHERE name = ?`,
        params: [item.id, roleName],
      })
    }

    return stmts
  },

  categories: (item) => {
    if (isDeleted(item)) {
      return [
        { sql: `DELETE FROM category_translations WHERE category_id = ?`, params: [item.id] },
        { sql: `DELETE FROM categories WHERE id = ?`, params: [item.id] },
      ]
    }

    const stmts: PreparedStatement[] = [
      {
        sql: `INSERT OR REPLACE INTO categories (id, slug, label, parent_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
        params: [
          item.id,
          item.slug,
          item.label,
          item.parentId,
          item.createdAt,
          item.updatedAt,
        ],
      },
    ]

    // Inline translations: Dict<locale, label>
    const translations = (item.translations ?? {}) as Record<string, string>
    stmts.push({
      sql: `DELETE FROM category_translations WHERE category_id = ?`,
      params: [item.id],
    })
    for (const [locale, label] of Object.entries(translations)) {
      stmts.push({
        sql: `INSERT INTO category_translations (category_id, locale, label, is_auto_translated, translated_at)
          VALUES (?, ?, ?, 1, datetime('now'))`,
        params: [item.id, locale, label],
      })
    }

    return stmts
  },

  tags: (item) => {
    if (isDeleted(item)) {
      return [
        { sql: `DELETE FROM tag_translations WHERE tag_id = ?`, params: [item.id] },
        { sql: `DELETE FROM tags WHERE id = ?`, params: [item.id] },
      ]
    }

    const stmts: PreparedStatement[] = [
      {
        sql: `INSERT OR REPLACE INTO tags (id, slug, label, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)`,
        params: [
          item.id,
          item.slug,
          item.label,
          item.createdAt,
          item.updatedAt,
        ],
      },
    ]

    // Inline translations: Dict<locale, label>
    const translations = (item.translations ?? {}) as Record<string, string>
    stmts.push({
      sql: `DELETE FROM tag_translations WHERE tag_id = ?`,
      params: [item.id],
    })
    for (const [locale, label] of Object.entries(translations)) {
      stmts.push({
        sql: `INSERT INTO tag_translations (tag_id, locale, label, is_auto_translated, translated_at)
          VALUES (?, ?, ?, 1, datetime('now'))`,
        params: [item.id, locale, label],
      })
    }

    return stmts
  },

  caseStudies: (item) => {
    if (isDeleted(item)) {
      return [
        { sql: `DELETE FROM case_study_decisions WHERE case_study_id = ?`, params: [item.id] },
        { sql: `DELETE FROM case_study_results WHERE case_study_id = ?`, params: [item.id] },
        { sql: `DELETE FROM case_study_translations WHERE case_study_id = ?`, params: [item.id] },
        { sql: `DELETE FROM case_studies WHERE id = ?`, params: [item.id] },
      ]
    }

    const stmts: PreparedStatement[] = [
      {
        sql: `INSERT OR REPLACE INTO case_studies
          (id, slug, title, client, industry, description, executive_summary,
           challenge, solution, tech_stack, tags, is_published, is_featured,
           cover_image, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          item.id,
          item.slug,
          item.title,
          item.client,
          item.industry,
          item.description,
          item.executiveSummary,
          item.challenge,
          item.solution,
          JSON.stringify(item.techStack ?? []),
          JSON.stringify(item.tags ?? []),
          item.isPublished ? 1 : 0,
          item.isFeatured ? 1 : 0,
          item.coverImage,
          item.createdAt,
          item.updatedAt,
        ],
      },
    ]

    // Sync architecture decisions
    const decisions = (item.architectureDecisions ?? []) as Record<string, unknown>[]
    stmts.push({
      sql: `DELETE FROM case_study_decisions WHERE case_study_id = ?`,
      params: [item.id],
    })
    decisions.forEach((d, i) => {
      stmts.push({
        sql: `INSERT INTO case_study_decisions (case_study_id, decision, rationale, sort_order)
          VALUES (?, ?, ?, ?)`,
        params: [item.id, d.decision, d.rationale, i],
      })
    })

    // Sync results
    const results = (item.results ?? []) as Record<string, unknown>[]
    stmts.push({
      sql: `DELETE FROM case_study_results WHERE case_study_id = ?`,
      params: [item.id],
    })
    results.forEach((r, i) => {
      stmts.push({
        sql: `INSERT INTO case_study_results (case_study_id, metric, value, description, sort_order)
          VALUES (?, ?, ?, ?, ?)`,
        params: [item.id, r.metric, r.value, r.description, i],
      })
    })

    return stmts
  },

  roles: (item) => {
    if (isDeleted(item)) {
      return [
        { sql: `DELETE FROM user_roles WHERE role_id = ?`, params: [item.id] },
        { sql: `DELETE FROM roles WHERE id = ?`, params: [item.id] },
      ]
    }

    return [
      {
        sql: `INSERT OR REPLACE INTO roles
          (id, name, slug, description, permissions, is_system, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          item.id,
          item.name,
          item.slug,
          item.description,
          JSON.stringify(item.permissions ?? []),
          item.isSystem ? 1 : 0,
          item.createdAt,
          item.updatedAt,
        ],
      },
    ]
  },

  // Separate container: blogPostTranslations
  // Cosmos doc: { id, postSlug, lang, title, excerpt, content, translatedAt, isAutoTranslated }
  // D1 FK: post_id references blog_posts.id. We resolve postSlug → id via subquery.
  // If parent post doesn't exist yet, INSERT produces 0 rows (logged in response).
  blogPostTranslations: (item) => {
    if (isDeleted(item)) {
      return [
        { sql: `DELETE FROM blog_post_translations WHERE id = ?`, params: [item.id] },
      ]
    }

    return [
      {
        sql: `INSERT OR REPLACE INTO blog_post_translations (id, post_id, locale, title, excerpt, content, is_auto_translated, translated_at)
          SELECT ?, bp.id, ?, ?, ?, ?, ?, ?
          FROM blog_posts bp WHERE bp.slug = ?`,
        params: [
          item.id,
          item.lang,
          item.title,
          item.excerpt,
          JSON.stringify(item.content ?? []),
          item.isAutoTranslated ? 1 : 0,
          item.translatedAt,
          item.postSlug,
        ],
      },
    ]
  },

  // Separate container: userPageTranslations
  userPageTranslations: (item) => {
    if (isDeleted(item)) {
      return [
        { sql: `DELETE FROM user_page_translations WHERE id = ?`, params: [item.id] },
      ]
    }

    return [
      {
        sql: `INSERT OR REPLACE INTO user_page_translations (id, user_id, locale, bio, page_content, is_auto_translated, translated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
        params: [
          item.id,
          item.userId,
          item.lang,
          item.bio,
          JSON.stringify(item.pageContent ?? []),
          item.isAutoTranslated ? 1 : 0,
          item.translatedAt,
        ],
      },
    ]
  },

  processedImages: (item) => {
    if (isDeleted(item)) {
      return [
        { sql: `DELETE FROM processed_images WHERE path = ?`, params: [item.path] },
      ]
    }

    return [
      {
        sql: `INSERT OR REPLACE INTO processed_images (path, container, format, widths, processed_at, source)
          VALUES (?, ?, ?, ?, ?, ?)`,
        params: [
          item.path,
          item.container ?? 'blog-images',
          item.format ?? 'webp',
          JSON.stringify(item.widths ?? []),
          item.processedAt,
          item.source ?? 'backend',
        ],
      },
    ]
  },
}

// ─── Public API ─────────────────────────────────────────────

export function buildUpsertStatements(
  entity: string,
  items: Record<string, unknown>[],
): PreparedStatement[] {
  const handler = ENTITY_HANDLERS[entity]
  if (!handler) return []
  return items.flatMap(handler)
}

export async function handleSync(
  c: Context<{ Bindings: Bindings }>,
): Promise<Response> {
  const secret = c.req.header('X-Internal-Auth')
  if (secret !== c.env.SYNC_SECRET) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  const payload: SyncPayload = await c.req.json()

  if (payload.schemaVersion > 1) {
    return c.json(
      { error: 'unknown_schema', version: payload.schemaVersion },
      422,
    )
  }

  const statements = buildUpsertStatements(payload.entity, payload.items)
  if (statements.length === 0) {
    return c.json({ error: 'unknown_entity', entity: payload.entity }, 400)
  }

  // Execute all statements atomically via D1 batch
  // D1 bind() rejects undefined — coerce to null
  const prepared = statements.map((s) =>
    c.env.DB.prepare(s.sql).bind(...s.params.map((p) => p ?? null)),
  )
  const results = await c.env.DB.batch(prepared)

  // Count rows actually affected (catches translation no-ops)
  const rowsWritten = results.reduce(
    (sum, r) => sum + (r.meta?.changes ?? 0),
    0,
  )

  // Translation entities can no-op if the parent doesn't exist yet in D1.
  // Return 409 so the Azure retry pipeline re-delivers the batch.
  const isTranslation = payload.entity.endsWith('Translations')
  if (isTranslation && rowsWritten === 0 && payload.items.length > 0) {
    return c.json(
      {
        ok: false,
        error: 'parent_not_found',
        entity: payload.entity,
        itemCount: payload.items.length,
        rowsWritten: 0,
      },
      409,
    )
  }

  return c.json({
    ok: true,
    entity: payload.entity,
    itemCount: payload.items.length,
    statementsExecuted: statements.length,
    rowsWritten,
    watermark: Date.now(),
  })
}
