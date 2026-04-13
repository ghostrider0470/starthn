import { MongoClient, ObjectId } from 'mongodb'
import { writeFileSync } from 'fs'

const MONGO_URI = process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017'
const DB_NAME = process.env.MONGODB_DATABASE_NAME || 'horizon'
const OUTPUT = 'scripts/migration-output.sql'
const DRY_RUN = process.argv.includes('--dry-run')

function esc(val: any): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'boolean') return val ? '1' : '0'
  return `'${String(val).replace(/'/g, "''")}'`
}

function toId(objectId: any): string {
  if (!objectId) return crypto.randomUUID().replace(/-/g, '')
  return objectId instanceof ObjectId ? objectId.toHexString() : String(objectId).padStart(24, '0')
}

async function main() {
  const client = new MongoClient(MONGO_URI)
  await client.connect()
  const db = client.db(DB_NAME)
  const lines: string[] = []

  // 1. Roles
  const rolesCol = await db.collection('roles').find().toArray()
  const roleIdMap = new Map<string, string>() // name → id
  for (const r of rolesCol) {
    const id = toId(r._id)
    roleIdMap.set(r.name, id)
    lines.push(`INSERT INTO roles (id, name, slug, description, permissions, is_system, created_at, updated_at) VALUES (${esc(id)}, ${esc(r.name)}, ${esc(r.slug)}, ${esc(r.description)}, ${esc(JSON.stringify(r.permissions || []))}, ${r.isSystem ? 1 : 0}, ${esc(r.createdAt?.toISOString())}, ${esc(r.updatedAt?.toISOString())});`)
  }

  // 2. Categories
  const catsCol = await db.collection('categories').find().toArray()
  for (const c of catsCol) {
    const id = toId(c._id)
    lines.push(`INSERT INTO categories (id, slug, label, parent_id, created_at, updated_at) VALUES (${esc(id)}, ${esc(c.slug)}, ${esc(c.label)}, ${c.parentId ? esc(toId(c.parentId)) : 'NULL'}, ${esc(c.createdAt?.toISOString())}, ${esc(c.updatedAt?.toISOString())});`)
    // Category translations
    if (c.translations && typeof c.translations === 'object') {
      for (const [locale, label] of Object.entries(c.translations)) {
        if (typeof label === 'string') {
          lines.push(`INSERT INTO category_translations (id, category_id, locale, label, is_auto_translated, translated_at) VALUES (${esc(crypto.randomUUID().replace(/-/g, ''))}, ${esc(id)}, ${esc(locale)}, ${esc(label)}, 1, datetime('now'));`)
        }
      }
    }
  }

  // 3. Tags
  const tagsCol = await db.collection('tags').find().toArray()
  const tagIdMap = new Map<string, string>() // slug → id
  for (const t of tagsCol) {
    const id = toId(t._id)
    tagIdMap.set(t.slug, id)
    lines.push(`INSERT INTO tags (id, slug, label, created_at, updated_at) VALUES (${esc(id)}, ${esc(t.slug)}, ${esc(t.label)}, ${esc(t.createdAt?.toISOString())}, ${esc(t.updatedAt?.toISOString())});`)
    if (t.translations && typeof t.translations === 'object') {
      for (const [locale, label] of Object.entries(t.translations)) {
        if (typeof label === 'string') {
          lines.push(`INSERT INTO tag_translations (id, tag_id, locale, label, is_auto_translated, translated_at) VALUES (${esc(crypto.randomUUID().replace(/-/g, ''))}, ${esc(id)}, ${esc(locale)}, ${esc(label)}, 1, datetime('now'));`)
        }
      }
    }
  }

  // 4. Users
  const usersCol = await db.collection('users').find().toArray()
  for (const u of usersCol) {
    const id = toId(u._id)
    const social = u.socialLinks || {}
    lines.push(`INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, is_active, is_opted_out, email_notifications, sms_notifications, avatar_url, bio, profession, expertise, social_linkedin, social_twitter, social_github, social_website, slug, page_content, created_at, updated_at) VALUES (${esc(id)}, ${esc(u.email)}, ${esc(u.passwordHash)}, ${esc(u.firstName || '')}, ${esc(u.lastName || '')}, ${esc(u.phoneNumber)}, ${u.isActive !== false ? 1 : 0}, ${u.isOptedOut ? 1 : 0}, ${u.emailNotifications !== false ? 1 : 0}, ${u.smsNotifications ? 1 : 0}, ${esc(u.avatarUrl)}, ${esc(u.bio)}, ${esc(u.profession)}, ${esc(u.expertise ? JSON.stringify(u.expertise) : null)}, ${esc(social.linkedin)}, ${esc(social.twitter)}, ${esc(social.github)}, ${esc(social.website)}, ${esc(u.slug)}, ${esc(u.pageContent ? JSON.stringify(u.pageContent) : null)}, ${esc(u.createdAt?.toISOString())}, ${esc(u.updatedAt?.toISOString())});`)

    // User roles
    if (Array.isArray(u.roles)) {
      for (const roleName of u.roles) {
        const roleId = roleIdMap.get(roleName)
        if (roleId) {
          lines.push(`INSERT INTO user_roles (user_id, role_id) VALUES (${esc(id)}, ${esc(roleId)});`)
        }
      }
    }

    // API keys
    if (Array.isArray(u.apiKeys)) {
      for (const ak of u.apiKeys) {
        lines.push(`INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, key_suffix, expires_at, last_used_at, created_at) VALUES (${esc(toId(ak.id || ak._id))}, ${esc(id)}, ${esc(ak.name)}, ${esc(ak.keyHash)}, ${esc(ak.keyPrefix)}, ${esc(ak.keySuffix)}, ${esc(ak.expiresAt?.toISOString?.() ?? ak.expiresAt)}, ${esc(ak.lastUsedAt?.toISOString?.() ?? ak.lastUsedAt)}, ${esc(ak.createdAt?.toISOString?.() ?? ak.createdAt)});`)
      }
    }

    // Refresh token
    if (u.refreshToken?.tokenHash) {
      lines.push(`INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (${esc(crypto.randomUUID().replace(/-/g, ''))}, ${esc(id)}, ${esc(u.refreshToken.tokenHash)}, ${esc(u.refreshToken.expiresAt?.toISOString?.() ?? u.refreshToken.expiresAt)}, ${esc(u.refreshToken.createdAt?.toISOString?.() ?? new Date().toISOString())});`)
    }

    // User page translations
    if (u.pageTranslations && typeof u.pageTranslations === 'object') {
      for (const [locale, t] of Object.entries(u.pageTranslations as Record<string, any>)) {
        lines.push(`INSERT INTO user_page_translations (id, user_id, locale, bio, page_content, is_auto_translated, translated_at) VALUES (${esc(crypto.randomUUID().replace(/-/g, ''))}, ${esc(id)}, ${esc(locale)}, ${esc(t.bio)}, ${esc(t.pageContent ? JSON.stringify(t.pageContent) : null)}, ${t.isAutoTranslated ? 1 : 0}, ${esc(t.translatedAt?.toISOString?.() ?? new Date().toISOString())});`)
      }
    }
  }

  // 5. Blog posts
  const postsCol = await db.collection('blogPosts').find().toArray()
  for (const p of postsCol) {
    const id = toId(p._id)
    lines.push(`INSERT INTO blog_posts (id, slug, title, excerpt, content, is_published, is_featured, published_at, read_time, category, subcategory, cover_image, banner_image, author_id, author_name, created_at, updated_at) VALUES (${esc(id)}, ${esc(p.slug)}, ${esc(p.title)}, ${esc(p.excerpt)}, ${esc(JSON.stringify(p.content || []))}, ${p.isPublished ? 1 : 0}, ${p.isFeatured ? 1 : 0}, ${esc(p.publishedAt?.toISOString?.() ?? p.publishedAt)}, ${esc(p.readTime)}, ${esc(p.category)}, ${esc(p.subcategory)}, ${esc(p.coverImage)}, ${esc(p.bannerImage)}, ${p.authorId ? esc(toId(p.authorId)) : 'NULL'}, ${esc(p.author)}, ${esc(p.createdAt?.toISOString())}, ${esc(p.updatedAt?.toISOString())});`)

    // Blog post tags
    if (Array.isArray(p.tags)) {
      for (const tagSlug of p.tags) {
        const tagId = tagIdMap.get(tagSlug)
        if (tagId) {
          lines.push(`INSERT INTO blog_post_tags (post_id, tag_id) VALUES (${esc(id)}, ${esc(tagId)});`)
        }
      }
    }

    // Blog post translations
    if (p.translations && typeof p.translations === 'object') {
      for (const [locale, t] of Object.entries(p.translations as Record<string, any>)) {
        lines.push(`INSERT INTO blog_post_translations (id, post_id, locale, title, excerpt, content, is_auto_translated, translated_at) VALUES (${esc(crypto.randomUUID().replace(/-/g, ''))}, ${esc(id)}, ${esc(locale)}, ${esc(t.title)}, ${esc(t.excerpt)}, ${esc(t.content ? JSON.stringify(t.content) : null)}, ${t.isAutoTranslated ? 1 : 0}, ${esc(t.translatedAt?.toISOString?.() ?? new Date().toISOString())});`)
      }
    }
  }

  // 6. Case studies
  const casesCol = await db.collection('caseStudies').find().toArray()
  for (const cs of casesCol) {
    const id = toId(cs._id)
    lines.push(`INSERT INTO case_studies (id, slug, title, client, industry, description, executive_summary, challenge, solution, tech_stack, tags, is_published, is_featured, cover_image, created_at, updated_at) VALUES (${esc(id)}, ${esc(cs.slug)}, ${esc(cs.title)}, ${esc(cs.client)}, ${esc(cs.industry)}, ${esc(cs.description)}, ${esc(cs.executiveSummary)}, ${esc(cs.challenge)}, ${esc(cs.solution)}, ${esc(JSON.stringify(cs.techStack || []))}, ${esc(JSON.stringify(cs.tags || []))}, ${cs.isPublished ? 1 : 0}, ${cs.isFeatured ? 1 : 0}, ${esc(cs.coverImage)}, ${esc(cs.createdAt?.toISOString())}, ${esc(cs.updatedAt?.toISOString())});`)

    if (Array.isArray(cs.architectureDecisions)) {
      cs.architectureDecisions.forEach((d: any, i: number) => {
        lines.push(`INSERT INTO case_study_decisions (id, case_study_id, decision, rationale, sort_order) VALUES (${esc(crypto.randomUUID().replace(/-/g, ''))}, ${esc(id)}, ${esc(d.decision)}, ${esc(d.rationale)}, ${i});`)
      })
    }
    if (Array.isArray(cs.results)) {
      cs.results.forEach((r: any, i: number) => {
        lines.push(`INSERT INTO case_study_results (id, case_study_id, metric, value, description, sort_order) VALUES (${esc(crypto.randomUUID().replace(/-/g, ''))}, ${esc(id)}, ${esc(r.metric)}, ${esc(r.value)}, ${esc(r.description)}, ${i});`)
      })
    }
  }

  // 7. LLM Providers
  const providersCol = await db.collection('llmProviders').find().toArray()
  for (const p of providersCol) {
    const id = toId(p._id)
    lines.push(`INSERT INTO llm_providers (id, key, name, api, base_url, api_key, headers, models, is_active, created_at, updated_at) VALUES (${esc(id)}, ${esc(p.key)}, ${esc(p.name)}, ${esc(p.api || 'openai')}, ${esc(p.baseUrl)}, ${esc(p.apiKey)}, ${esc(JSON.stringify(p.headers || {}))}, ${esc(JSON.stringify(p.models || []))}, ${p.isActive !== false ? 1 : 0}, ${esc(p.createdAt?.toISOString())}, ${esc(p.updatedAt?.toISOString())});`)
  }

  // 8. LLM Settings
  const settingsCol = await db.collection('llmSettings').find().toArray()
  for (const s of settingsCol) {
    lines.push(`INSERT INTO llm_settings (id, chat_provider_key, chat_model_id, review_provider_key, review_model_id, translation_provider_key, translation_model_id, updated_at) VALUES ('global', ${esc(s.chatProviderKey)}, ${esc(s.chatModelId)}, ${esc(s.reviewProviderKey)}, ${esc(s.reviewModelId)}, ${esc(s.translationProviderKey)}, ${esc(s.translationModelId)}, ${esc(s.updatedAt?.toISOString())});`)
  }

  await client.close()

  const sql = lines.join('\n')
  if (DRY_RUN) {
    console.log(sql)
    console.log(`\n-- ${lines.length} statements generated (dry run)`)
  } else {
    writeFileSync(OUTPUT, sql, 'utf-8')
    console.log(`Written ${lines.length} statements to ${OUTPUT}`)
    console.log(`Run: npx wrangler d1 execute horizon-db --remote --file=${OUTPUT}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
