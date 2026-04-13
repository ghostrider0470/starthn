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
  author: string | null
  authorName: string | null
  authorAvatarUrl: string | null
  authorSlug: string | null
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
  pageContent: string | null
  socialLinks: {
    linkedIn: string | null
    twitter: string | null
    gitHub: string | null
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
  expertise: string[]
  pageContent: string | null
  socialLinks: {
    linkedIn: string | null
    twitter: string | null
    gitHub: string | null
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
