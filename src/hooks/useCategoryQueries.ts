import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoryService } from '@/services/category.service'
import type { CreateCategoryDto, UpdateCategoryDto, TranslateCategoryTarget } from '@/services/category.service'

export const categoryKeys = {
  all: ['categories'] as const,
  public: () => [...categoryKeys.all, 'public'] as const,
  admin: () => [...categoryKeys.all, 'admin'] as const,
}

export function usePublicCategories() {
  return useQuery({
    queryKey: categoryKeys.public(),
    queryFn: () => categoryService.fetchPublicCategories(),
    staleTime: 60 * 60 * 1000,
  })
}

export function useAdminCategories() {
  return useQuery({
    queryKey: categoryKeys.admin(),
    queryFn: () => categoryService.fetchAdminCategories(),
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCategoryDto) => categoryService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryDto }) =>
      categoryService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

export function useTranslateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, targets }: { id: string; targets: TranslateCategoryTarget[] }) =>
      categoryService.translateCategory(id, targets),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => categoryService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all })
    },
  })
}
