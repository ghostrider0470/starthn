import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import blogService from '@/services/blog.service'
import type {
  BlogQueryParams,
  CreateBlogPostDto,
  UpdateBlogPostDto,
  UpdateTranslationDto,
} from '@/services/blog.service'

// Query keys
export const blogKeys = {
  all: ['blog'] as const,
  posts: (lang?: string) => [...blogKeys.all, 'posts', lang ?? 'en-US'] as const,
  postsPaged: (lang?: string, query?: BlogQueryParams) =>
    [...blogKeys.all, 'posts-paged', lang ?? 'en-US', query ?? {}] as const,
  post: (slug: string, lang?: string) =>
    [...blogKeys.all, 'post', slug, lang ?? 'en-US'] as const,
  categories: () => [...blogKeys.all, 'categories'] as const,
  admin: () => [...blogKeys.all, 'admin'] as const,
  adminPosts: () => [...blogKeys.admin(), 'posts'] as const,
  adminStats: () => [...blogKeys.admin(), 'stats'] as const,
  translations: (slug: string) =>
    [...blogKeys.admin(), 'translations', slug] as const,
}

// Public hooks

export function useBlogPosts(lang?: string) {
  return useQuery({
    queryKey: blogKeys.posts(lang),
    queryFn: () => blogService.fetchBlogPosts(lang),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 2000,
  })
}

export function useBlogPostsPaged(lang?: string, query?: BlogQueryParams) {
  return useQuery({
    queryKey: blogKeys.postsPaged(lang, query),
    queryFn: () => blogService.fetchBlogPostsPaged(lang, query),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 1,
    retryDelay: 2000,
  })
}

export function useBlogPost(slug: string, lang?: string) {
  return useQuery({
    queryKey: blogKeys.post(slug, lang),
    queryFn: () => blogService.fetchBlogPostBySlug(slug, lang),
    enabled: !!slug,
  })
}

export function useRelatedBlogPosts(locale: string, category: string, excludeSlug: string) {
  const query = useBlogPosts(locale)
  const relatedPosts = (query.data ?? [])
    .filter((p) => p.category === category && p.slug !== excludeSlug)
    .slice(0, 3)
  return { ...query, data: relatedPosts }
}

// Admin hooks

export function useAdminBlogPosts() {
  return useQuery({
    queryKey: blogKeys.adminPosts(),
    queryFn: () => blogService.fetchAdminBlogPosts(),
  })
}

export function useAdminStats() {
  return useQuery({
    queryKey: blogKeys.adminStats(),
    queryFn: () => blogService.fetchAdminStats(),
  })
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateBlogPostDto) => blogService.createBlogPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.all })
    },
  })
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      slug,
      data,
    }: {
      slug: string
      data: UpdateBlogPostDto
    }) => blogService.updateBlogPost(slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.all })
    },
  })
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (slug: string) => blogService.deleteBlogPost(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.all })
    },
  })
}

export function useSeedBlogPosts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (posts: CreateBlogPostDto[]) =>
      blogService.seedBlogPosts(posts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.all })
    },
  })
}

// Translation hooks

export function useBlogTranslations(slug: string) {
  return useQuery({
    queryKey: blogKeys.translations(slug),
    queryFn: () => blogService.fetchTranslations(slug),
    enabled: !!slug,
  })
}

export function useTranslateBlogPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      slug,
      languages,
    }: {
      slug: string
      languages: string[]
    }) => blogService.translateBlogPost(slug, languages),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.all })
    },
  })
}

export function useUpdateBlogTranslation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      slug,
      lang,
      data,
    }: {
      slug: string
      lang: string
      data: UpdateTranslationDto
    }) => blogService.updateTranslation(slug, lang, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.all })
    },
  })
}

export function useDeleteBlogTranslation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ slug, lang }: { slug: string; lang: string }) =>
      blogService.deleteTranslation(slug, lang),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blogKeys.all })
    },
  })
}
