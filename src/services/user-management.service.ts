import api from './api'

export interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl?: string
  roles: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  slug?: string
  profession?: string
}

export interface AdminUsersResponse {
  users: AdminUser[]
  total: number
  page: number
  pageSize: number
}

export const userManagementService = {
  fetchUsers: (params?: { search?: string; role?: string; page?: number; pageSize?: number }) =>
    api.get<AdminUsersResponse>('/manage/users', { params }).then((r) => r.data),
  fetchUser: (id: string) =>
    api.get<AdminUser>(`/manage/users/${id}`).then((r) => r.data),
  updateRoles: (id: string, roles: string[]) =>
    api.put(`/manage/users/${id}/roles`, { roles }),
  updateStatus: (id: string, isActive: boolean) =>
    api.put(`/manage/users/${id}/status`, { isActive }),
}
