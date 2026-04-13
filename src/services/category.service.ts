import api from './api'

export interface Category {
  id: string
  slug: string
  label: string
  translations: Record<string, string>
  parentId: string | null
}

export interface CreateCategoryDto {
  slug: string
  label: string
  translations: Record<string, string>
  parentId?: string | null
}

export interface UpdateCategoryDto {
  slug?: string
  label?: string
  translations?: Record<string, string>
  parentId?: string | null
}

export interface TranslateCategoryTarget {
  localeCode: string
  translatorCode: string
}

export const categoryService = {
  fetchPublicCategories: () =>
    api.get<Category[]>('/blog/categories').then((r) => r.data),
  fetchAdminCategories: () =>
    api.get<Category[]>('/manage/categories').then((r) => r.data),
  createCategory: (data: CreateCategoryDto) =>
    api.post<Category>('/manage/categories', data).then((r) => r.data),
  updateCategory: (id: string, data: UpdateCategoryDto) =>
    api.put<Category>(`/manage/categories/${id}`, data).then((r) => r.data),
  translateCategory: (id: string, targets: TranslateCategoryTarget[]) =>
    api.post<Category>(`/manage/categories/${id}/translate`, { targets }).then((r) => r.data),
  deleteCategory: (id: string) =>
    api.delete(`/manage/categories/${id}`),
}
