import api from './api'

export interface SocialLinks {
  linkedIn?: string
  twitter?: string
  gitHub?: string
  website?: string
}

export interface AuthorProfile {
  id: string
  slug: string
  firstName: string
  lastName: string
  avatarUrl?: string
  bio?: string
  profession?: string
  expertise: string[]
  socialLinks: SocialLinks
  postCount: number
  pageContent?: string
}

export interface UpdateAuthorProfileDto {
  bio?: string
  profession?: string
  expertise?: string[]
  socialLinks?: SocialLinks
  slug?: string
}

export const authorService = {
  fetchAuthors: () => api.get<AuthorProfile[]>('/authors').then((r) => r.data),
  fetchAuthorBySlug: (slug: string, lang?: string) => {
    const params = lang ? { lang } : {}
    return api.get<AuthorProfile>(`/authors/${slug}`, { params }).then((r) => r.data)
  },
  fetchAdminAuthors: () => api.get<AuthorProfile[]>('/manage/authors').then((r) => r.data),
  updateAuthorProfile: (id: string, data: UpdateAuthorProfileDto) =>
    api.put<AuthorProfile>(`/manage/authors/${id}`, data).then((r) => r.data),
}
