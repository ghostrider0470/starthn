import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tagService } from '@/services/tag.service'
import type { CreateTagDto, UpdateTagDto, TranslateTagTarget } from '@/services/tag.service'

export const tagKeys = {
  all: ['tags'] as const,
  public: () => [...tagKeys.all, 'public'] as const,
  admin: () => [...tagKeys.all, 'admin'] as const,
}

export function usePublicTags(initialData?: any) {
  return useQuery({
    queryKey: tagKeys.public(),
    queryFn: () => tagService.fetchPublicTags(),
    staleTime: 60 * 60 * 1000,
    ...(initialData ? { initialData, initialDataUpdatedAt: Date.now() } : {}),
  })
}

export function useAdminTags() {
  return useQuery({
    queryKey: tagKeys.admin(),
    queryFn: () => tagService.fetchAdminTags(),
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTagDto) => tagService.createTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all })
    },
  })
}

export function useUpdateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTagDto }) =>
      tagService.updateTag(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all })
    },
  })
}

export function useTranslateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, targets }: { id: string; targets: TranslateTagTarget[] }) =>
      tagService.translateTag(id, targets),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all })
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => tagService.deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all })
    },
  })
}
