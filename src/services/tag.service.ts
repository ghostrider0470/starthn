import api from './api'

export interface Tag {
  id: string
  slug: string
  label: string
  translations: Record<string, string>
}

export interface CreateTagDto {
  slug: string
  label: string
  translations: Record<string, string>
}

export interface UpdateTagDto {
  slug?: string
  label?: string
  translations?: Record<string, string>
}

export interface TranslateTagTarget {
  localeCode: string
  translatorCode: string
}

export const tagService = {
  fetchPublicTags: () =>
    api.get<Tag[]>('/blog/tags').then((r) => r.data),
  fetchAdminTags: () =>
    api.get<Tag[]>('/manage/tags').then((r) => r.data),
  createTag: (data: CreateTagDto) =>
    api.post<Tag>('/manage/tags', data).then((r) => r.data),
  updateTag: (id: string, data: UpdateTagDto) =>
    api.put<Tag>(`/manage/tags/${id}`, data).then((r) => r.data),
  translateTag: (id: string, targets: TranslateTagTarget[]) =>
    api.post<Tag>(`/manage/tags/${id}/translate`, { targets }).then((r) => r.data),
  deleteTag: (id: string) =>
    api.delete(`/manage/tags/${id}`),
}
