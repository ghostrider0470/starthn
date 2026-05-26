-- D1 Schema: 19 tables for Start HN backend

-- Core entities
CREATE TABLE IF NOT EXISTS users (
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
  expertise TEXT,
  social_linkedin TEXT,
  social_twitter TEXT,
  social_github TEXT,
  social_website TEXT,
  slug TEXT UNIQUE,
  page_content TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS case_studies (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  client TEXT,
  industry TEXT,
  description TEXT,
  executive_summary TEXT,
  challenge TEXT,
  solution TEXT,
  tech_stack TEXT,
  tags TEXT,
  is_published INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  cover_image TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT NOT NULL DEFAULT '[]',
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS llm_providers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  api TEXT NOT NULL DEFAULT 'openai',
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  headers TEXT NOT NULL DEFAULT '{}',
  models TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS llm_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  chat_provider_key TEXT,
  chat_model_id TEXT,
  review_provider_key TEXT,
  review_model_id TEXT,
  translation_provider_key TEXT,
  translation_model_id TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Normalized embedded objects
CREATE TABLE IF NOT EXISTS api_keys (
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

CREATE TABLE IF NOT EXISTS case_study_decisions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  case_study_id TEXT NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  rationale TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS case_study_results (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  case_study_id TEXT NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Translation tables
CREATE TABLE IF NOT EXISTS blog_post_translations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  post_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  title TEXT,
  excerpt TEXT,
  content TEXT,
  is_auto_translated INTEGER NOT NULL DEFAULT 0,
  translated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(post_id, locale)
);

CREATE TABLE IF NOT EXISTS category_translations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  label TEXT NOT NULL,
  is_auto_translated INTEGER NOT NULL DEFAULT 0,
  translated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(category_id, locale)
);

CREATE TABLE IF NOT EXISTS tag_translations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  label TEXT NOT NULL,
  is_auto_translated INTEGER NOT NULL DEFAULT 0,
  translated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tag_id, locale)
);

CREATE TABLE IF NOT EXISTS case_study_translations (
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

CREATE TABLE IF NOT EXISTS user_page_translations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  bio TEXT,
  page_content TEXT,
  is_auto_translated INTEGER NOT NULL DEFAULT 0,
  translated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, locale)
);

-- Join tables
CREATE TABLE IF NOT EXISTS blog_post_tags (
  post_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_slug ON users(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_case_studies_slug ON case_studies(slug);
CREATE INDEX IF NOT EXISTS idx_case_studies_published ON case_studies(is_published);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_translations_lookup ON blog_post_translations(post_id, locale);
CREATE INDEX IF NOT EXISTS idx_category_translations_lookup ON category_translations(category_id, locale);
CREATE INDEX IF NOT EXISTS idx_tag_translations_lookup ON tag_translations(tag_id, locale);
CREATE INDEX IF NOT EXISTS idx_case_study_translations_lookup ON case_study_translations(case_study_id, locale);
CREATE INDEX IF NOT EXISTS idx_user_page_translations_lookup ON user_page_translations(user_id, locale);
CREATE INDEX IF NOT EXISTS idx_case_study_decisions_study ON case_study_decisions(case_study_id);
CREATE INDEX IF NOT EXISTS idx_case_study_results_study ON case_study_results(case_study_id);

-- Processed image manifest (mirrored from MongoDB)
CREATE TABLE IF NOT EXISTS processed_images (
  path TEXT PRIMARY KEY,
  format TEXT NOT NULL DEFAULT 'webp',
  widths TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  source TEXT NOT NULL
);
