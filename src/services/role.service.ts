import api from './api'

export interface Role {
  id: string
  name: string
  slug: string
  description: string
  permissions: string[]
  isSystem: boolean
}

export interface PublicRole {
  name: string
  slug: string
  description: string
}

export interface PermissionGroup {
  [category: string]: string[]
}

export interface CreateRoleDto {
  name: string
  description: string
  permissions: string[]
}

export interface UpdateRoleDto {
  name?: string
  description?: string
  permissions?: string[]
}

export const roleService = {
  fetchPublicRoles: () =>
    api.get<PublicRole[]>('/roles').then((r) => r.data),
  fetchPermissions: () =>
    api.get<PermissionGroup>('/permissions').then((r) => r.data),
  fetchAdminRoles: () =>
    api.get<Role[]>('/manage/roles').then((r) => r.data),
  createRole: (data: CreateRoleDto) =>
    api.post<Role>('/manage/roles', data).then((r) => r.data),
  updateRole: (id: string, data: UpdateRoleDto) =>
    api.put<Role>(`/manage/roles/${id}`, data).then((r) => r.data),
  deleteRole: (id: string) =>
    api.delete(`/manage/roles/${id}`),
}
