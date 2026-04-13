import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID().replace(/-/g, ''))
const timestamps = {
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}

// ─── Core entities ──────────────────────────────────────────

export const users = sqliteTable('users', {
  id: id(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  firstName: text('first_name').notNull().default(''),
  lastName: text('last_name').notNull().default(''),
  phoneNumber: text('phone_number'),
  isActive: integer('is_active').notNull().default(1),
  isOptedOut: integer('is_opted_out').notNull().default(0),
  emailNotifications: integer('email_notifications').notNull().default(1),
  smsNotifications: integer('sms_notifications').notNull().default(0),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  profession: text('profession'),
  expertise: text('expertise'), // JSON array
  socialLinkedin: text('social_linkedin'),
  socialTwitter: text('social_twitter'),
  socialGithub: text('social_github'),
  socialWebsite: text('social_website'),
  slug: text('slug').unique(),
  pageContent: text('page_content'), // JSON array
  ...timestamps,
}, (t) => [
  index('idx_users_email').on(t.email),
  index('idx_users_slug').on(t.slug),
])

export const blogPosts = sqliteTable('blog_posts', {
  id: id(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  content: text('content').notNull(), // JSON array
  isPublished: integer('is_published').notNull().default(0),
  isFeatured: integer('is_featured').notNull().default(0),
  publishedAt: text('published_at'),
  readTime: integer('read_time'),
  category: text('category'),
  subcategory: text('subcategory'),
  coverImage: text('cover_image'),
  bannerImage: text('banner_image'),
  authorId: text('author_id').references(() => users.id),
  authorName: text('author_name'),
  ...timestamps,
}, (t) => [
  index('idx_blog_posts_slug').on(t.slug),
  index('idx_blog_posts_published').on(t.isPublished, t.publishedAt),
  index('idx_blog_posts_author').on(t.authorId),
  index('idx_blog_posts_category').on(t.category),
])

export const categories = sqliteTable('categories', {
  id: id(),
  slug: text('slug').notNull().unique(),
  label: text('label').notNull(),
  parentId: text('parent_id'),
  ...timestamps,
}, (t) => [
  index('idx_categories_slug').on(t.slug),
  index('idx_categories_parent').on(t.parentId),
])

export const tags = sqliteTable('tags', {
  id: id(),
  slug: text('slug').notNull().unique(),
  label: text('label').notNull(),
  ...timestamps,
}, (t) => [
  index('idx_tags_slug').on(t.slug),
])

export const caseStudies = sqliteTable('case_studies', {
  id: id(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  client: text('client'),
  industry: text('industry'),
  description: text('description'),
  executiveSummary: text('executive_summary'),
  challenge: text('challenge'),
  solution: text('solution'),
  techStack: text('tech_stack'), // JSON array
  tags: text('tags'), // JSON array
  isPublished: integer('is_published').notNull().default(0),
  isFeatured: integer('is_featured').notNull().default(0),
  coverImage: text('cover_image'),
  ...timestamps,
}, (t) => [
  index('idx_case_studies_slug').on(t.slug),
  index('idx_case_studies_published').on(t.isPublished),
])

export const roles = sqliteTable('roles', {
  id: id(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  permissions: text('permissions').notNull().default('[]'), // JSON array
  isSystem: integer('is_system').notNull().default(0),
  ...timestamps,
})

export const llmProviders = sqliteTable('llm_providers', {
  id: id(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  api: text('api').notNull().default('openai'),
  baseUrl: text('base_url').notNull(),
  apiKey: text('api_key').notNull(),
  headers: text('headers').notNull().default('{}'), // JSON object
  models: text('models').notNull().default('[]'), // JSON array
  isActive: integer('is_active').notNull().default(1),
  ...timestamps,
})

export const llmSettings = sqliteTable('llm_settings', {
  id: text('id').primaryKey().default('global'),
  chatProviderKey: text('chat_provider_key'),
  chatModelId: text('chat_model_id'),
  reviewProviderKey: text('review_provider_key'),
  reviewModelId: text('review_model_id'),
  translationProviderKey: text('translation_provider_key'),
  translationModelId: text('translation_model_id'),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// ─── Normalized embedded objects ────────────────────────────

export const apiKeys = sqliteTable('api_keys', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(),
  keyPrefix: text('key_prefix').notNull(),
  keySuffix: text('key_suffix').notNull(),
  expiresAt: text('expires_at'),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (t) => [
  index('idx_api_keys_user').on(t.userId),
  index('idx_api_keys_hash').on(t.keyHash),
])

export const caseStudyDecisions = sqliteTable('case_study_decisions', {
  id: id(),
  caseStudyId: text('case_study_id').notNull().references(() => caseStudies.id, { onDelete: 'cascade' }),
  decision: text('decision').notNull(),
  rationale: text('rationale').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => [
  index('idx_case_study_decisions_study').on(t.caseStudyId),
])

export const caseStudyResults = sqliteTable('case_study_results', {
  id: id(),
  caseStudyId: text('case_study_id').notNull().references(() => caseStudies.id, { onDelete: 'cascade' }),
  metric: text('metric').notNull(),
  value: text('value').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => [
  index('idx_case_study_results_study').on(t.caseStudyId),
])

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (t) => [
  index('idx_refresh_tokens_hash').on(t.tokenHash),
  index('idx_refresh_tokens_user').on(t.userId),
])

// ─── Translation tables ─────────────────────────────────────

export const blogPostTranslations = sqliteTable('blog_post_translations', {
  id: id(),
  postId: text('post_id').notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
  locale: text('locale').notNull(),
  title: text('title'),
  excerpt: text('excerpt'),
  content: text('content'), // JSON array
  isAutoTranslated: integer('is_auto_translated').notNull().default(0),
  translatedAt: text('translated_at').notNull().default(sql`(datetime('now'))`),
}, (t) => [
  uniqueIndex('idx_blog_post_translations_lookup').on(t.postId, t.locale),
])

export const categoryTranslations = sqliteTable('category_translations', {
  id: id(),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  locale: text('locale').notNull(),
  label: text('label').notNull(),
  isAutoTranslated: integer('is_auto_translated').notNull().default(0),
  translatedAt: text('translated_at').notNull().default(sql`(datetime('now'))`),
}, (t) => [
  uniqueIndex('idx_category_translations_lookup').on(t.categoryId, t.locale),
])

export const tagTranslations = sqliteTable('tag_translations', {
  id: id(),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  locale: text('locale').notNull(),
  label: text('label').notNull(),
  isAutoTranslated: integer('is_auto_translated').notNull().default(0),
  translatedAt: text('translated_at').notNull().default(sql`(datetime('now'))`),
}, (t) => [
  uniqueIndex('idx_tag_translations_lookup').on(t.tagId, t.locale),
])

export const caseStudyTranslations = sqliteTable('case_study_translations', {
  id: id(),
  caseStudyId: text('case_study_id').notNull().references(() => caseStudies.id, { onDelete: 'cascade' }),
  locale: text('locale').notNull(),
  title: text('title'),
  description: text('description'),
  challenge: text('challenge'),
  solution: text('solution'),
  executiveSummary: text('executive_summary'),
  isAutoTranslated: integer('is_auto_translated').notNull().default(0),
  translatedAt: text('translated_at').notNull().default(sql`(datetime('now'))`),
}, (t) => [
  uniqueIndex('idx_case_study_translations_lookup').on(t.caseStudyId, t.locale),
])

export const userPageTranslations = sqliteTable('user_page_translations', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  locale: text('locale').notNull(),
  bio: text('bio'),
  pageContent: text('page_content'), // JSON array
  isAutoTranslated: integer('is_auto_translated').notNull().default(0),
  translatedAt: text('translated_at').notNull().default(sql`(datetime('now'))`),
}, (t) => [
  uniqueIndex('idx_user_page_translations_lookup').on(t.userId, t.locale),
])

// ─── Join tables ────────────────────────────────────────────

export const blogPostTags = sqliteTable('blog_post_tags', {
  postId: text('post_id').notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => [
  primaryKey({ columns: [t.postId, t.tagId] }),
])

export const userRoles = sqliteTable('user_roles', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
}, (t) => [
  primaryKey({ columns: [t.userId, t.roleId] }),
])

// ─── Image pipeline ─────────────────────────────────────────

export const processedImages = sqliteTable('processed_images', {
  path: text('path').primaryKey(),
  container: text('container').notNull().default('blog-images'),
  format: text('format').notNull().default('webp'),
  widths: text('widths').notNull(),
  processedAt: text('processed_at').notNull(),
  source: text('source').notNull(),
})
