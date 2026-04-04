import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authorService } from '@/services/author.service'
import type { UpdateAuthorProfileDto } from '@/services/author.service'

export const authorKeys = {
  all: ['authors'] as const,
  public: () => [...authorKeys.all, 'public'] as const,
  admin: () => [...authorKeys.all, 'admin'] as const,
  bySlug: (slug: string, lang?: string) => [...authorKeys.all, 'slug', slug, lang] as const,
}

export function usePublicAuthors() {
  return useQuery({
    queryKey: authorKeys.public(),
    queryFn: () => authorService.fetchAuthors(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useAuthorBySlug(slug: string, lang?: string) {
  return useQuery({
    queryKey: authorKeys.bySlug(slug, lang),
    queryFn: () => authorService.fetchAuthorBySlug(slug, lang),
    enabled: !!slug,
  })
}

export function useAdminAuthors() {
  return useQuery({
    queryKey: authorKeys.admin(),
    queryFn: () => authorService.fetchAdminAuthors(),
  })
}

export function useUpdateAuthorProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAuthorProfileDto }) =>
      authorService.updateAuthorProfile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authorKeys.all })
    },
  })
}
