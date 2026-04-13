export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  is_active: number;
  is_opted_out: number;
  email_notifications: number;
  sms_notifications: number;
  avatar_url: string | null;
  bio: string | null;
  profession: string | null;
  expertise: string | null;
  social_linkedin: string | null;
  social_twitter: string | null;
  social_github: string | null;
  social_website: string | null;
  slug: string | null;
  page_content: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  is_published: number;
  is_featured: number;
  published_at: string | null;
  read_time: number | null;
  category: string | null;
  subcategory: string | null;
  cover_image: string | null;
  banner_image: string | null;
  author_id: string | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: string;
  slug: string;
  label: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TagRow {
  id: string;
  slug: string;
  label: string;
  created_at: string;
  updated_at: string;
}

export interface CaseStudyRow {
  id: string;
  slug: string;
  title: string;
  client: string | null;
  industry: string | null;
  description: string | null;
  executive_summary: string | null;
  challenge: string | null;
  solution: string | null;
  tech_stack: string | null;
  tags: string | null;
  is_published: number;
  is_featured: number;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: string | null;
  is_system: number;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyRow {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  key_suffix: string;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

export interface CaseStudyDecisionRow {
  id: string;
  case_study_id: string;
  decision: string;
  rationale: string | null;
  sort_order: number;
}

export interface CaseStudyResultRow {
  id: string;
  case_study_id: string;
  metric: string;
  value: string | null;
  description: string | null;
  sort_order: number;
}

export interface LlmProviderRow {
  id: string;
  key: string;
  name: string;
  api: string | null;
  base_url: string | null;
  api_key: string | null;
  headers: string | null;
  models: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface LlmSettingsRow {
  id: string;
  chat_provider_key: string | null;
  chat_model_id: string | null;
  review_provider_key: string | null;
  review_model_id: string | null;
  translation_provider_key: string | null;
  translation_model_id: string | null;
  updated_at: string;
}

export interface BlogPostTranslationRow {
  id: string;
  post_id: string;
  locale: string;
  title: string | null;
  excerpt: string | null;
  content: string | null;
  is_auto_translated: number;
  translated_at: string | null;
}

export interface CategoryTranslationRow {
  id: string;
  category_id: string;
  locale: string;
  label: string | null;
  is_auto_translated: number;
  translated_at: string | null;
}

export interface TagTranslationRow {
  id: string;
  tag_id: string;
  locale: string;
  label: string | null;
  is_auto_translated: number;
  translated_at: string | null;
}

export interface CaseStudyTranslationRow {
  id: string;
  case_study_id: string;
  locale: string;
  title: string | null;
  description: string | null;
  challenge: string | null;
  solution: string | null;
  executive_summary: string | null;
  is_auto_translated: number;
  translated_at: string | null;
}

export interface UserPageTranslationRow {
  id: string;
  user_id: string;
  locale: string;
  bio: string | null;
  page_content: string | null;
  is_auto_translated: number;
  translated_at: string | null;
}
