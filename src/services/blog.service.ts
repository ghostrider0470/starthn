import api from './api'
import type { BlogPost } from '@/data/blog-posts'
import { toTranslatorLocaleCode } from '@/lib/i18n-utils'
import { convertToWebpVariants } from '@/lib/image-convert'

// Admin-only fields extending the public BlogPost type
export interface AdminBlogPost extends BlogPost {
  id: string
  isPublished: boolean
  authorId?: string
  authorSlug?: string
  authorAvatarUrl?: string
  createdAt: string
  updatedAt: string
}

export interface CreateBlogPostDto {
  slug?: string
  title: string
  excerpt: string
  publishedAt: string
  readTime: string
  category: string
  subcategory?: string
  tags: string[]
  content: string[]
  isPublished: boolean
  isFeatured?: boolean
  coverImage?: string
  bannerImage?: string
}

export interface UpdateBlogPostDto {
  slug?: string
  title?: string
  excerpt?: string
  publishedAt?: string
  author?: string
  readTime?: string
  category?: string
  subcategory?: string
  tags?: string[]
  content?: string[]
  isPublished?: boolean
  isFeatured?: boolean
  coverImage?: string
  bannerImage?: string
}

export interface BlogPostTranslation {
  title: string
  excerpt: string
  content: string[]
  isAutoTranslated: boolean
  translatedAt: string
}

export interface AdminBlogPostWithTranslations extends AdminBlogPost {
  translations: Record<string, BlogPostTranslation>
}

export interface TranslateBlogPostDto {
  languages: string[]
}

export interface UpdateTranslationDto {
  title?: string
  excerpt?: string
  content?: string[]
}

export interface AdminStats {
  totalUsers: number
  totalPosts: number
  publishedPosts: number
}

export interface PaginatedBlogResponse {
  items: BlogPost[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface BlogQueryParams {
  page?: number
  pageSize?: number
  category?: string
  subcategory?: string
  tag?: string
  q?: string
}

class BlogService {
  // Public endpoints

  async fetchBlogPosts(lang?: string): Promise<BlogPost[]> {
    const translatorCode = lang && lang !== 'en-US' ? toTranslatorLocaleCode(lang) : undefined
    const params = translatorCode ? { lang: translatorCode } : {}
    const response = await api.get<BlogPost[]>('/blog', { params })
    return response.data
  }

  async fetchBlogPostsPaged(lang?: string, query?: BlogQueryParams): Promise<PaginatedBlogResponse> {
    const translatorCode = lang && lang !== 'en-US' ? toTranslatorLocaleCode(lang) : undefined
    const params: Record<string, string | number> = {
      page: query?.page ?? 1,
      pageSize: query?.pageSize ?? 9,
    }
    if (translatorCode) params.lang = translatorCode
    if (query?.category) params.category = query.category
    if (query?.subcategory) params.subcategory = query.subcategory
    if (query?.tag) params.tag = query.tag
    if (query?.q) params.q = query.q
    const response = await api.get<PaginatedBlogResponse>('/blog', { params })
    return response.data
  }

  async fetchBlogPostBySlug(slug: string, lang?: string): Promise<BlogPost> {
    const translatorCode = lang && lang !== 'en-US' ? toTranslatorLocaleCode(lang) : undefined
    const params = translatorCode ? { lang: translatorCode } : {}
    const response = await api.get<BlogPost>(`/blog/${slug}`, { params })
    return response.data
  }

  async fetchBlogCategories(): Promise<string[]> {
    const response = await api.get<string[]>('/blog/categories')
    return response.data
  }

  // Image upload

  async uploadImage(file: File, slug?: string, replaceUrl?: string): Promise<{ url: string }> {
    const formData = new FormData()
    formData.append('original', file, file.name)
    if (slug) formData.append('slug', slug)
    if (replaceUrl) formData.append('replaceUrl', replaceUrl)

    try {
      const variants = await convertToWebpVariants(file)
      for (const v of variants) {
        formData.append(`variant_${v.width}`, v.blob, `${file.name}.w${v.width}.webp`)
      }
    } catch (err) {
      console.warn('[upload] client-side webp conversion failed, uploading original only', err)
    }

    const response = await api.post<{ url: string }>('/manage/blog/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  }

  // Admin endpoints

  async fetchAdminBlogPosts(): Promise<AdminBlogPost[]> {
    const response = await api.get<AdminBlogPost[]>('/manage/blog')
    return response.data
  }

  async createBlogPost(data: CreateBlogPostDto): Promise<AdminBlogPost> {
    const response = await api.post<AdminBlogPost>('/manage/blog', data)
    return response.data
  }

  async updateBlogPost(slug: string, data: UpdateBlogPostDto): Promise<AdminBlogPost> {
    const response = await api.put<AdminBlogPost>(`/manage/blog/${slug}`, data)
    return response.data
  }

  async deleteBlogPost(slug: string): Promise<void> {
    await api.delete(`/manage/blog/${slug}`)
  }

  async seedBlogPosts(posts: CreateBlogPostDto[]): Promise<{ message: string; inserted: number }> {
    const response = await api.post<{ message: string; inserted: number }>('/manage/blog/seed', posts)
    return response.data
  }

  async fetchAdminStats(): Promise<AdminStats> {
    const response = await api.get<AdminStats>('/manage/stats')
    return response.data
  }

  // Translation endpoints

  async translateBlogPost(slug: string, languages: string[]): Promise<Record<string, BlogPostTranslation>> {
    const response = await api.post<Record<string, BlogPostTranslation>>(
      `/manage/blog/${slug}/translate`,
      { languages },
    )
    return response.data
  }

  async fetchTranslations(slug: string): Promise<Record<string, BlogPostTranslation>> {
    const response = await api.get<Record<string, BlogPostTranslation>>(
      `/manage/blog/${slug}/translations`,
    )
    return response.data
  }

  async updateTranslation(slug: string, lang: string, data: UpdateTranslationDto): Promise<BlogPostTranslation> {
    const response = await api.put<BlogPostTranslation>(
      `/manage/blog/${slug}/translations/${lang}`,
      data,
    )
    return response.data
  }

  async deleteTranslation(slug: string, lang: string): Promise<void> {
    await api.delete(`/manage/blog/${slug}/translations/${lang}`)
  }
}

export default new BlogService()
